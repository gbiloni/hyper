// Corre con:  node --test tests/whatsappSyncInicial.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { pedirSyncContactos } from '../src/lib/whatsappSyncInicial.ts';

const PNID = '106540352242922';

// Base en memoria: una fila de crm_cuentas con la constancia del pedido.
function crearDb({ cuenta = { horas: null }, faltaColumna = false, fallaUpdate = false } = {}) {
  const estado = { cuenta: cuenta ? { ...cuenta } : null, updates: [] };
  return {
    estado,
    async query(sql, params = []) {
      const s = sql.replace(/\s+/g, ' ');
      if (s.startsWith('SELECT')) {
        if (faltaColumna) throw new Error("Unknown column 'sync_contactos_at' in 'field list'");
        return [estado.cuenta ? [estado.cuenta] : []];
      }
      if (s.startsWith('UPDATE crm_cuentas SET sync_contactos_request_id')) {
        if (fallaUpdate) throw new Error('db caída');
        estado.updates.push(params);
        return [{}];
      }
      throw new Error(`SQL no esperado: ${s}`);
    },
  };
}

// fetch falso: responde según la URL y guarda las llamadas.
function crearFetch({ estadoNumero = { is_on_biz_app: true, platform_type: 'CLOUD_API' }, respuestaPedido, fallaConsulta } = {}) {
  const llamadas = [];
  const fn = async (url, init = {}) => {
    llamadas.push({ url: String(url), init });
    const u = String(url);
    if (u.includes('/smb_app_data')) {
      const r = respuestaPedido ?? { status: 200, body: { messaging_product: 'whatsapp', request_id: 'REQ-1' } };
      return { ok: r.status < 400, json: async () => r.body };
    }
    if (fallaConsulta) return { ok: false, json: async () => ({ error: { message: 'Invalid OAuth access token', code: 190 } }) };
    return { ok: true, json: async () => ({ ...estadoNumero, id: PNID }) };
  };
  fn.llamadas = llamadas;
  return fn;
}

test('coexistencia sin pedido previo: pide la agenda y deja constancia', async () => {
  const db = crearDb();
  const fetchFn = crearFetch();
  const r = await pedirSyncContactos(PNID, 'TOKEN', { db, fetchFn });

  assert.deepEqual(r, { estado: 'solicitado', requestId: 'REQ-1' });
  assert.deepEqual(db.estado.updates, [['REQ-1', PNID]]);

  const post = fetchFn.llamadas.find((c) => c.url.includes('/smb_app_data'));
  assert.equal(post.init.method, 'POST');
  assert.deepEqual(JSON.parse(post.init.body), { messaging_product: 'whatsapp', sync_type: 'smb_app_state_sync' });
  assert.equal(post.init.headers.Authorization, 'Bearer TOKEN');
  assert.ok(post.url.startsWith(`https://graph.facebook.com/v24.0/${PNID}/smb_app_data`));
});

test('nunca pide el historial (sync_type "history")', async () => {
  const fetchFn = crearFetch();
  await pedirSyncContactos(PNID, 'T', { db: crearDb(), fetchFn });
  assert.ok(fetchFn.llamadas.every((c) => !String(c.init.body ?? '').includes('history')));
});

test('el token nunca va en la URL', async () => {
  const fetchFn = crearFetch();
  await pedirSyncContactos(PNID, 'TOKEN-SECRETO', { db: crearDb(), fetchFn });
  assert.ok(fetchFn.llamadas.every((c) => !c.url.includes('TOKEN-SECRETO')));
});

test('número que no es coexistencia: no pide nada', async () => {
  const db = crearDb();
  const fetchFn = crearFetch({ estadoNumero: { is_on_biz_app: false, platform_type: 'CLOUD_API' } });
  const r = await pedirSyncContactos(PNID, 'T', { db, fetchFn });

  assert.deepEqual(r, { estado: 'omitido', motivo: 'el número no está en coexistencia' });
  assert.equal(fetchFn.llamadas.some((c) => c.url.includes('/smb_app_data')), false);
  assert.equal(db.estado.updates.length, 0);
});

test('ya pedido hace menos de 24 h (mismo alta): no lo repite y ni llama a Meta', async () => {
  const fetchFn = crearFetch();
  const r = await pedirSyncContactos(PNID, 'T', { db: crearDb({ cuenta: { horas: 2 } }), fetchFn });
  assert.equal(r.estado, 'omitido');
  assert.equal(fetchFn.llamadas.length, 0);
});

test('pedido de hace más de 24 h (alta anterior): sí lo vuelve a pedir', async () => {
  const db = crearDb({ cuenta: { horas: 300 } });
  const r = await pedirSyncContactos(PNID, 'T', { db, fetchFn: crearFetch() });
  assert.equal(r.estado, 'solicitado');
  assert.equal(db.estado.updates.length, 1);
});

test('falta la migración: NO pide (no gasta la única oportunidad a ciegas)', async () => {
  const fetchFn = crearFetch();
  const r = await pedirSyncContactos(PNID, 'T', { db: crearDb({ faltaColumna: true }), fetchFn });
  assert.equal(r.estado, 'omitido');
  assert.equal(fetchFn.llamadas.length, 0);
});

test('cuenta inexistente en crm_cuentas: omitido', async () => {
  const fetchFn = crearFetch();
  const r = await pedirSyncContactos(PNID, 'T', { db: crearDb({ cuenta: null }), fetchFn });
  assert.equal(r.estado, 'omitido');
  assert.equal(fetchFn.llamadas.length, 0);
});

test('Meta rechaza la consulta del número (token inválido): error, sin constancia', async () => {
  const db = crearDb();
  const r = await pedirSyncContactos(PNID, 'T', { db, fetchFn: crearFetch({ fallaConsulta: true }) });
  assert.equal(r.estado, 'error');
  assert.match(r.motivo, /Invalid OAuth access token \(#190\)/);
  assert.equal(db.estado.updates.length, 0);
});

test('Meta rechaza el pedido: error con el motivo, sin constancia (se puede reintentar)', async () => {
  const db = crearDb();
  const fetchFn = crearFetch({ respuestaPedido: { status: 400, body: { error: { message: 'Sync already requested', code: 100 } } } });
  const r = await pedirSyncContactos(PNID, 'T', { db, fetchFn });
  assert.deepEqual(r, { estado: 'error', motivo: 'Sync already requested (#100)' });
  assert.equal(db.estado.updates.length, 0);
});

test('si falla guardar la constancia, igual devuelve "solicitado" (el pedido ya salió)', async () => {
  const r = await pedirSyncContactos(PNID, 'T', { db: crearDb({ fallaUpdate: true }), fetchFn: crearFetch() });
  assert.deepEqual(r, { estado: 'solicitado', requestId: 'REQ-1' });
});

test('error de red: no lanza, devuelve error', async () => {
  const fetchFn = async () => { throw new Error('ECONNRESET'); };
  const r = await pedirSyncContactos(PNID, 'T', { db: crearDb(), fetchFn });
  assert.deepEqual(r, { estado: 'error', motivo: 'ECONNRESET' });
});
