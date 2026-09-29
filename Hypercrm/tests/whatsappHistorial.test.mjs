// Corre con:  node --test tests/whatsappHistorial.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// whatsappHistorial.ts importa './whatsappEchoes' sin extensión (como pide
// Next); Node sin bundler necesita el ".ts". Este hook lo agrega solo acá.
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith('.') && !/\.[cm]?[jt]s$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});
const { procesarHistorial } = await import('../src/lib/whatsappHistorial.ts');

// Base en memoria con las consultas que usa procesarHistorial.
function crearDb({ mensajes = [], conversaciones = [], fallarInsertCon = null } = {}) {
  const estado = { mensajes: [...mensajes], conversaciones: [...conversaciones], sigId: 100 };
  return {
    estado,
    async query(sql, params = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT waba_message_id, message_type FROM whatsapp_messages')) {
        const ids = params[0];
        return [estado.mensajes.filter((m) => ids.includes(m.waba_message_id))];
      }
      if (s.startsWith('UPDATE whatsapp_messages SET message_type')) {
        const [tipo, content, id, placeholder] = params;
        const m = estado.mensajes.find((x) => x.waba_message_id === id && x.message_type === placeholder);
        if (m) Object.assign(m, { message_type: tipo, content });
        return [{ affectedRows: m ? 1 : 0 }];
      }
      if (s.startsWith('SELECT id, id_nodo, phone_number_id FROM whatsapp_conversations')) {
        const [tel, pnid] = params;
        return [estado.conversaciones.filter((c) => c.phone_number === tel && (c.phone_number_id === pnid || c.phone_number_id == null))];
      }
      if (s.startsWith('UPDATE whatsapp_conversations')) {
        const [pnid, primero1, primero2, ultimo1, ultimo2, id] = params;
        const c = estado.conversaciones.find((x) => x.id === id);
        c.phone_number_id ??= pnid;
        c.first_message_at = Math.min(c.first_message_at ?? primero1, primero2);
        c.last_message_at = Math.max(c.last_message_at ?? ultimo1, ultimo2);
        return [{}];
      }
      if (s.startsWith('INSERT INTO whatsapp_conversations')) {
        const [id_nodo, phone_number, phone_number_id, first_message_at, last_message_at] = params;
        const id = estado.sigId++;
        estado.conversaciones.push({ id, id_nodo, phone_number, phone_number_id, first_message_at, last_message_at });
        return [{ insertId: id }];
      }
      if (s.startsWith('INSERT INTO whatsapp_messages')) {
        const cols = ['id_nodo', 'conversation_id', 'phone_number', 'direction', 'message_type', 'content', 'waba_message_id', 'status', 'created_at'];
        const filas = [];
        for (let i = 0; i < params.length; i += cols.length) {
          filas.push(Object.fromEntries(cols.map((c, j) => [c, params[i + j]])));
        }
        if (fallarInsertCon && filas.some((f) => f.phone_number === fallarInsertCon)) throw new Error('db caída');
        estado.mensajes.push(...filas);
        return [{ affectedRows: filas.length }];
      }
      throw new Error(`SQL no esperado en el test: ${s}`);
    },
  };
}

const PNID = '106540352242922';
const NEGOCIO = '15550783881';
const cuentaOk = async (pnid) => (pnid === PNID ? { id_nodo: 7 } : null);
const deps = (db) => ({ db, getCuenta: cuentaOk });

// Payload EXACTO del ejemplo de la doc de Meta (history, compartido).
const historialDeMeta = [
  {
    metadata: { phase: 0, chunk_order: 1, progress: 55 },
    threads: [
      {
        id: '16505551234',
        messages: [
          { from: NEGOCIO, id: 'wamid.A', timestamp: '1739230955', type: 'text', text: { body: "Here's the info you requested!" }, history_context: { status: 'READ' } },
          { from: NEGOCIO, id: 'wamid.B', timestamp: '1739230970', type: 'media_placeholder', history_context: { status: 'PLAYED' } },
          { from: '16505551234', id: 'wamid.C', timestamp: '1739230971', type: 'text', text: { body: 'Thanks!' }, history_context: { status: 'READ' } },
        ],
      },
      {
        id: '12125557890',
        messages: [
          { from: NEGOCIO, id: 'wamid.D', timestamp: '1739230980', type: 'text', text: { body: 'Thanks for your order!' }, history_context: { status: 'DELIVERED' } },
        ],
      },
    ],
  },
];

test('guarda cada hilo con dirección, estado y fecha ORIGINAL de cada mensaje', async () => {
  const db = crearDb();
  const r = await procesarHistorial(historialDeMeta, PNID, deps(db));

  assert.equal(r.guardados, 4);
  assert.equal(r.progreso, 55);
  const porId = Object.fromEntries(db.estado.mensajes.map((m) => [m.waba_message_id, m]));
  assert.deepEqual(
    { d: porId['wamid.A'].direction, s: porId['wamid.A'].status, c: porId['wamid.A'].content, t: porId['wamid.A'].created_at },
    { d: 'OUTBOUND', s: 'READ', c: "Here's the info you requested!", t: 1739230955 }
  );
  assert.equal(porId['wamid.B'].message_type, 'media_placeholder');
  assert.equal(porId['wamid.B'].status, 'READ'); // PLAYED → READ
  assert.deepEqual([porId['wamid.C'].direction, porId['wamid.C'].status], ['INBOUND', 'DELIVERED']);
  assert.equal(porId['wamid.D'].status, 'DELIVERED');
});

test('crea las conversaciones que no existen, en la ciudad de la cuenta y con el rango de fechas del hilo', async () => {
  const db = crearDb();
  await procesarHistorial(historialDeMeta, PNID, deps(db));

  assert.equal(db.estado.conversaciones.length, 2);
  const c = db.estado.conversaciones.find((x) => x.phone_number === '16505551234');
  assert.deepEqual(
    { nodo: c.id_nodo, pnid: c.phone_number_id, desde: c.first_message_at, hasta: c.last_message_at },
    { nodo: 7, pnid: PNID, desde: 1739230955, hasta: 1739230971 }
  );
});

test('conversación existente: no se duplica, se amplía el rango y no se pisa el último mensaje más nuevo', async () => {
  const nuevo = 1790000000; // un mensaje en vivo posterior al historial
  const db = crearDb({
    conversaciones: [{ id: 5, id_nodo: 3, phone_number: '16505551234', phone_number_id: null, first_message_at: nuevo, last_message_at: nuevo }],
  });
  await procesarHistorial(historialDeMeta, PNID, deps(db));

  const c = db.estado.conversaciones.find((x) => x.id === 5);
  assert.equal(c.phone_number_id, PNID);
  assert.equal(c.first_message_at, 1739230955);
  assert.equal(c.last_message_at, nuevo);
  assert.ok(db.estado.mensajes.filter((m) => m.phone_number === '16505551234').every((m) => m.conversation_id === 5 && m.id_nodo === 3));
});

test('reintento del mismo webhook: no duplica nada', async () => {
  const db = crearDb();
  await procesarHistorial(historialDeMeta, PNID, deps(db));
  const r = await procesarHistorial(historialDeMeta, PNID, deps(db));
  assert.equal(r.guardados, 0);
  assert.equal(r.duplicados, 4);
  assert.equal(db.estado.mensajes.length, 4);
});

test('el webhook posterior del adjunto reemplaza al placeholder (mismo id)', async () => {
  const db = crearDb();
  await procesarHistorial(historialDeMeta, PNID, deps(db));
  const adjunto = [{
    metadata: { phase: 0, chunk_order: 2, progress: 60 },
    threads: [{ id: '16505551234', messages: [
      { from: NEGOCIO, id: 'wamid.B', timestamp: '1739230970', type: 'video', video: { id: '1234567890' }, history_context: { status: 'PLAYED' } },
    ] }],
  }];
  const r = await procesarHistorial(adjunto, PNID, deps(db));

  assert.equal(r.adjuntosCompletados, 1);
  const b = db.estado.mensajes.find((m) => m.waba_message_id === 'wamid.B');
  assert.deepEqual([b.message_type, b.content], ['video', '[Adjunto: video]']);
  assert.equal(db.estado.mensajes.length, 4);
});

test('historial NO compartido (error 2593109): no guarda nada y lo informa', async () => {
  const db = crearDb();
  const r = await procesarHistorial([{ errors: [{ code: 2593109, title: 'History sync is turned off by the business' }] }], PNID, deps(db));
  assert.equal(r.rechazado, true);
  assert.equal(db.estado.mensajes.length, 0);
});

test('phone_number_id sin cuenta activa: no escribe nada', async () => {
  const db = crearDb();
  const r = await procesarHistorial(historialDeMeta, 'otro', deps(db));
  assert.equal(r.guardados, 0);
  assert.equal(db.estado.mensajes.length, 0);
});

test('mensajes sin id o sin timestamp se ignoran; ids repetidos dentro del mismo chunk se guardan una vez', async () => {
  const db = crearDb();
  const r = await procesarHistorial([{ threads: [{ id: '16505551234', messages: [
    { from: NEGOCIO, timestamp: '1739230955', type: 'text', text: { body: 'sin id' } },
    { from: NEGOCIO, id: 'wamid.X', type: 'text', text: { body: 'sin fecha' } },
    { from: NEGOCIO, id: 'wamid.Y', timestamp: '1739230955', type: 'text', text: { body: 'ok' } },
    { from: NEGOCIO, id: 'wamid.Y', timestamp: '1739230955', type: 'text', text: { body: 'ok' } },
  ] }] }], PNID, deps(db));
  assert.deepEqual([r.guardados, r.ignorados, r.duplicados], [1, 2, 1]);
});

test('un hilo que falla no frena al resto del lote', async () => {
  const db = crearDb({ fallarInsertCon: '16505551234' });
  const r = await procesarHistorial(historialDeMeta, PNID, deps(db));
  assert.equal(r.guardados, 1); // solo el segundo hilo
  assert.equal(r.ignorados, 3);
  assert.equal(db.estado.mensajes[0].waba_message_id, 'wamid.D');
});

test('normaliza el teléfono del hilo a dígitos', async () => {
  const db = crearDb();
  await procesarHistorial([{ threads: [{ id: '+1 650-555-1234', messages: [
    { from: '+1 650-555-1234', id: 'wamid.Z', timestamp: '1739230955', type: 'text', text: { body: 'hola' } },
  ] }] }], PNID, deps(db));
  assert.deepEqual([db.estado.mensajes[0].phone_number, db.estado.mensajes[0].direction], ['16505551234', 'INBOUND']);
});
