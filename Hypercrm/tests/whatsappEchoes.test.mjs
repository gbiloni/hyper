// Corre con:  node --test tests/
// (Node 24 ejecuta el .ts directo; no hace falta instalar nada.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { procesarEchos, contenidoDeMensaje } from '../src/lib/whatsappEchoes.ts';

// Base en memoria: reconoce solo las consultas que usa procesarEchos.
function crearDb({ conversaciones = [], mensajes = [] } = {}) {
  const estado = { conversaciones: [...conversaciones], mensajes: [...mensajes], sigId: 100 };
  return {
    estado,
    async query(sql, params = []) {
      const s = sql.replace(/\s+/g, ' ');
      if (s.includes('SELECT id FROM whatsapp_messages WHERE waba_message_id')) {
        return [estado.mensajes.filter((m) => m.waba_message_id === params[0]).map((m) => ({ id: m.id }))];
      }
      if (s.includes('FROM whatsapp_conversations WHERE phone_number = ?')) {
        const [tel, pnid] = params;
        return [estado.conversaciones.filter((c) => c.phone_number === tel && (c.phone_number_id === pnid || c.phone_number_id == null))];
      }
      if (s.includes('INSERT INTO whatsapp_conversations')) {
        const [id_nodo, phone_number, phone_number_id] = params;
        const fila = { id: ++estado.sigId, id_nodo, phone_number, phone_number_id, escalated_to_agent: 0, flow_state: null };
        estado.conversaciones.push(fila);
        return [{ insertId: fila.id }];
      }
      if (s.includes('INSERT INTO whatsapp_messages')) {
        const [id_nodo, conversation_id, phone_number, message_type, content, waba_message_id] = params;
        assert.match(s, /'OUTBOUND'/);
        assert.match(s, /'SENT'/);
        estado.mensajes.push({ id: ++estado.sigId, id_nodo, conversation_id, phone_number, message_type, content, waba_message_id, direction: 'OUTBOUND' });
        return [{ insertId: estado.sigId }];
      }
      if (s.includes('escalated_to_agent = 1')) {
        estado.conversaciones.find((c) => c.id === params[0]).escalated_to_agent = 1;
        return [{}];
      }
      if (s.includes('UPDATE whatsapp_conversations SET phone_number_id')) {
        estado.conversaciones.find((c) => c.id === params[1]).phone_number_id = params[0];
        return [{}];
      }
      throw new Error(`SQL no esperado en el test: ${s}`);
    },
  };
}

const PHONE_NUMBER_ID = '106540352242922';
const cuentaOk = async (pnid) => (pnid === PHONE_NUMBER_ID ? { id_nodo: 7 } : null);

// Estructura EXACTA de la doc de Meta (smb_message_echoes): from = negocio, to = cliente.
const echoDeMeta = {
  from: '15550783881',
  to: '16505551234',
  id: 'wamid.HBgLMTY0NjcwNDM1OTUVAgARGBIyNDlBOEI5QUQ4NDc0N0FCNjMA',
  timestamp: '1700255121',
  type: 'text',
  text: { body: 'Info solicitada' },
};

test('guarda el echo como OUTBOUND en la conversación del CLIENTE (to), no del negocio (from)', async () => {
  const db = crearDb({
    conversaciones: [{ id: 5, id_nodo: 3, phone_number: '16505551234', phone_number_id: PHONE_NUMBER_ID, escalated_to_agent: 0 }],
  });
  const r = await procesarEchos([echoDeMeta], PHONE_NUMBER_ID, { db, getCuenta: cuentaOk });

  assert.deepEqual(r, { guardados: 1, duplicados: 0, ignorados: 0 });
  assert.equal(db.estado.mensajes.length, 1);
  const m = db.estado.mensajes[0];
  assert.equal(m.phone_number, '16505551234'); // cliente
  assert.notEqual(m.phone_number, echoDeMeta.from);
  assert.equal(m.conversation_id, 5);
  assert.equal(m.id_nodo, 3); // respeta la ciudad ya asignada a la conversación
  assert.equal(m.content, 'Info solicitada');
  assert.equal(m.message_type, 'text');
  assert.equal(m.waba_message_id, echoDeMeta.id);
  // Un humano tomó la conversación: el bot deja de intervenir.
  assert.equal(db.estado.conversaciones[0].escalated_to_agent, 1);
  assert.equal(db.estado.conversaciones.length, 1); // no crea otra
});

test('si no hay conversación, la crea en la ciudad principal de la cuenta, sin flow_state', async () => {
  const db = crearDb();
  const r = await procesarEchos([echoDeMeta], PHONE_NUMBER_ID, { db, getCuenta: cuentaOk });

  assert.equal(r.guardados, 1);
  assert.equal(db.estado.conversaciones.length, 1);
  const c = db.estado.conversaciones[0];
  assert.equal(c.phone_number, '16505551234');
  assert.equal(c.phone_number_id, PHONE_NUMBER_ID);
  assert.equal(c.id_nodo, 7);
  assert.equal(c.flow_state, null); // no dispara "¿sobre cuál ciudad?"
  assert.equal(c.escalated_to_agent, 1);
  assert.equal(db.estado.mensajes[0].conversation_id, c.id);
});

test('un echo repetido (reintento del webhook) no se guarda dos veces', async () => {
  const db = crearDb();
  await procesarEchos([echoDeMeta], PHONE_NUMBER_ID, { db, getCuenta: cuentaOk });
  const r = await procesarEchos([echoDeMeta], PHONE_NUMBER_ID, { db, getCuenta: cuentaOk });

  assert.deepEqual(r, { guardados: 0, duplicados: 1, ignorados: 0 });
  assert.equal(db.estado.mensajes.length, 1);
});

test('phone_number_id sin cuenta activa: no escribe nada', async () => {
  const db = crearDb();
  const r = await procesarEchos([echoDeMeta], 'otro-numero', { db, getCuenta: cuentaOk });

  assert.deepEqual(r, { guardados: 0, duplicados: 0, ignorados: 1 });
  assert.equal(db.estado.mensajes.length, 0);
  assert.equal(db.estado.conversaciones.length, 0);
});

test('echo sin "to" o sin "id" se ignora sin romper el resto del lote', async () => {
  const db = crearDb();
  const r = await procesarEchos(
    [{ ...echoDeMeta, to: undefined }, { ...echoDeMeta, id: undefined }, { ...echoDeMeta, id: 'wamid.OK' }],
    PHONE_NUMBER_ID,
    { db, getCuenta: cuentaOk }
  );
  assert.deepEqual(r, { guardados: 1, duplicados: 0, ignorados: 2 });
  assert.equal(db.estado.mensajes[0].waba_message_id, 'wamid.OK');
});

test('fila vieja con phone_number_id NULL se matchea y se completa', async () => {
  const db = crearDb({
    conversaciones: [{ id: 9, id_nodo: 2, phone_number: '16505551234', phone_number_id: null, escalated_to_agent: 0 }],
  });
  await procesarEchos([echoDeMeta], PHONE_NUMBER_ID, { db, getCuenta: cuentaOk });
  assert.equal(db.estado.conversaciones.length, 1);
  assert.equal(db.estado.conversaciones[0].phone_number_id, PHONE_NUMBER_ID);
  assert.equal(db.estado.mensajes[0].conversation_id, 9);
});

test('contenidoDeMensaje: texto, interactivo y adjuntos', () => {
  assert.deepEqual(contenidoDeMensaje({ type: 'text', text: { body: 'hola' } }), { tipo: 'text', contenido: 'hola' });
  assert.deepEqual(contenidoDeMensaje({ type: 'image', image: {} }), { tipo: 'image', contenido: '[Adjunto: image]' });
  assert.deepEqual(
    contenidoDeMensaje({ type: 'interactive', interactive: { button_reply: { title: 'Sí' } } }),
    { tipo: 'interactive', contenido: 'Sí' }
  );
});
