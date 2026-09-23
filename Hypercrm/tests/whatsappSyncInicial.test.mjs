// Corre con:  node --test tests/whatsappSyncInicial.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { pedirSyncInicial } from '../src/lib/whatsappSyncInicial.ts';

const PNID = '106540352242922';
const V = 'v26.0';

// Base en memoria: una fila de crm_cuentas con las constancias de los pedidos.
// `horas` = horas desde el pedido anterior de cada tipo (null = nunca).
function crearDb({ cuenta = { contactos: null, historial: null }, faltaColumna = [], fallaUpdate = false } = {}) {
  const estado = { cuenta: cuenta ? { ...cuenta } : null, updates: [] };
  return {
    estado,
    async query(sql, params = []) {
      const s = sql.replace(/\s+/g, ' ');
      const tipo = s.includes('sync_contactos') ? 'contactos' : s.includes('sync_historial') ? 'historial' : null;
      if (s.startsWith('SELECT')) {
        if (faltaColumna.includes(tipo)) throw new Error(`Unknown column 'sync_${tipo}_at' in 'field list'`);
        return [estado.cuenta ? [{ horas: estado.cuenta[tipo] }] : []];
      }
      if (s.startsWith('UPDATE crm_cuentas SET')) {
        if (fallaUpdate) throw new Error('db caída');
        estado.updates.push([tipo, ...params]);
        return [{}];
      }
      throw new Error(`SQL no esperado: ${s}`);
    },
  };
}

// fetch falso: responde según la URL/body y guarda las llamadas.
function crearFetch({ estadoNumero = { is_on_biz_app: true, platform_type: 'CLOUD_API' }, respuestas = {}, fallaConsulta } = {}) {
  const llamadas = [];
  const fn = async (url, init = {}) => {
    llamadas.push({ url: String(url), init });
    if (String(url).includes('/smb_app_data')) {
      const tipo = JSON.parse(init.body).sync_type;
      const r = respuestas[tipo] ?? { status: 200, body: { messaging_product: 'whatsapp', request_id: `REQ-${tipo}` } };
      return { ok: r.status < 400, json: async () => r.body };
    }
    if (fallaConsulta) return { ok: false, json: async () => ({ error: { message: 'Invalid OAuth access token', code: 190 } }) };
    return { ok: true, json: async () => ({ ...estadoNumero, id: PNID }) };
  };
  fn.llamadas = llamadas;
  fn.pedidos = () => llamadas.filter((c) => c.url.includes('/smb_app_data')).map((c) => JSON.parse(c.init.body).sync_type);
  return fn;
}

const deps = (db, fetchFn) => ({ db, fetchFn, graphVersion: V });

test('coexistencia sin pedidos previos: pide contactos y DESPUÉS historial, y deja constancia de ambos', async () => {
  const db = crearDb();
  const fetchFn = crearFetch();
  const r = await pedirSyncInicial(PNID, 'TOKEN', deps(db, fetchFn));

  assert.deepEqual(r, {
    contactos: { estado: 'solicitado', requestId: 'REQ-smb_app_state_sync' },
    historial: { estado: 'solicitado', requestId: 'REQ-history' },
  });
  assert.deepEqual(fetchFn.pedidos(), ['smb_app_state_sync', 'history']); // orden que pide Meta
  assert.deepEqual(db.estado.updates, [
    ['contactos', 'REQ-smb_app_state_sync', PNID],
    ['historial', 'REQ-history', PNID],
  ]);

  const post = fetchFn.llamadas.find((c) => c.url.includes('/smb_app_data'));
  assert.equal(post.init.method, 'POST');
  assert.deepEqual(JSON.parse(post.init.body), { messaging_product: 'whatsapp', sync_type: 'smb_app_state_sync' });
  assert.equal(post.init.headers.Authorization, 'Bearer TOKEN');
  assert.ok(post.url.startsWith(`https://graph.facebook.com/${V}/${PNID}/smb_app_data`));
});

test('consulta is_on_biz_app una sola vez para los dos pedidos', async () => {
  const fetchFn = crearFetch();
  await pedirSyncInicial(PNID, 'T', deps(crearDb(), fetchFn));
  assert.equal(fetchFn.llamadas.filter((c) => c.url.includes('fields=is_on_biz_app')).length, 1);
});

test('el token nunca va en la URL', async () => {
  const fetchFn = crearFetch();
  await pedirSyncInicial(PNID, 'TOKEN-SECRETO', deps(crearDb(), fetchFn));
  assert.ok(fetchFn.llamadas.every((c) => !c.url.includes('TOKEN-SECRETO')));
});

test('número que no es coexistencia: no pide nada', async () => {
  const db = crearDb();
  const fetchFn = crearFetch({ estadoNumero: { is_on_biz_app: false, platform_type: 'CLOUD_API' } });
  const r = await pedirSyncInicial(PNID, 'T', deps(db, fetchFn));

  assert.equal(r.contactos.estado, 'omitido');
  assert.equal(r.historial.estado, 'omitido');
  assert.deepEqual(fetchFn.pedidos(), []);
  assert.equal(db.estado.updates.length, 0);
});

test('contactos ya pedidos hace menos de 24 h: no los repite, pero sí pide el historial', async () => {
  const fetchFn = crearFetch();
  const r = await pedirSyncInicial(PNID, 'T', deps(crearDb({ cuenta: { contactos: 2, historial: null } }), fetchFn));
  assert.equal(r.contactos.estado, 'omitido');
  assert.equal(r.historial.estado, 'solicitado');
  assert.deepEqual(fetchFn.pedidos(), ['history']);
});

test('pedidos de hace más de 24 h (alta anterior): se vuelven a pedir', async () => {
  const db = crearDb({ cuenta: { contactos: 300, historial: 300 } });
  const r = await pedirSyncInicial(PNID, 'T', deps(db, crearFetch()));
  assert.equal(r.contactos.estado, 'solicitado');
  assert.equal(r.historial.estado, 'solicitado');
});

test('falta la migración del historial: pide contactos, NO historial (no gasta la oportunidad a ciegas)', async () => {
  const fetchFn = crearFetch();
  const r = await pedirSyncInicial(PNID, 'T', deps(crearDb({ faltaColumna: ['historial'] }), fetchFn));
  assert.equal(r.contactos.estado, 'solicitado');
  assert.equal(r.historial.estado, 'omitido');
  assert.deepEqual(fetchFn.pedidos(), ['smb_app_state_sync']);
});

test('faltan las dos migraciones: no pide nada', async () => {
  const fetchFn = crearFetch();
  const r = await pedirSyncInicial(PNID, 'T', deps(crearDb({ faltaColumna: ['contactos', 'historial'] }), fetchFn));
  assert.equal(r.contactos.estado, 'omitido');
  assert.equal(r.historial.estado, 'omitido');
  assert.deepEqual(fetchFn.pedidos(), []);
});

test('cuenta inexistente en crm_cuentas: omitido', async () => {
  const fetchFn = crearFetch();
  const r = await pedirSyncInicial(PNID, 'T', deps(crearDb({ cuenta: null }), fetchFn));
  assert.equal(r.contactos.estado, 'omitido');
  assert.deepEqual(fetchFn.pedidos(), []);
});

test('Meta rechaza la consulta del número (token inválido): error en ambos, sin constancia', async () => {
  const db = crearDb();
  const r = await pedirSyncInicial(PNID, 'T', deps(db, crearFetch({ fallaConsulta: true })));
  assert.equal(r.contactos.estado, 'error');
  assert.match(r.historial.motivo, /Invalid OAuth access token \(#190\)/);
  assert.equal(db.estado.updates.length, 0);
});

test('Meta rechaza el pedido de contactos: error con el motivo, sin constancia, y el historial se pide igual', async () => {
  const db = crearDb();
  const fetchFn = crearFetch({ respuestas: { smb_app_state_sync: { status: 400, body: { error: { message: 'Sync already requested', code: 100 } } } } });
  const r = await pedirSyncInicial(PNID, 'T', deps(db, fetchFn));
  assert.deepEqual(r.contactos, { estado: 'error', motivo: 'Sync already requested (#100)' });
  assert.equal(r.historial.estado, 'solicitado');
  assert.deepEqual(db.estado.updates.map((u) => u[0]), ['historial']);
});

test('si falla guardar la constancia, igual devuelve "solicitado" (el pedido ya salió)', async () => {
  const r = await pedirSyncInicial(PNID, 'T', deps(crearDb({ fallaUpdate: true }), crearFetch()));
  assert.equal(r.contactos.estado, 'solicitado');
  assert.equal(r.historial.estado, 'solicitado');
});

test('error de red: no lanza, devuelve error', async () => {
  const fetchFn = async () => { throw new Error('ECONNRESET'); };
  const r = await pedirSyncInicial(PNID, 'T', deps(crearDb(), fetchFn));
  assert.deepEqual(r.contactos, { estado: 'error', motivo: 'ECONNRESET' });
});
