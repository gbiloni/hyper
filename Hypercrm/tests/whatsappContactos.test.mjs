// Corre con:  node --test tests/whatsappContactos.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { procesarContactos } from '../src/lib/whatsappContactos.ts';

// Base en memoria: reconoce solo las consultas que usa procesarContactos.
function crearDb({ contactos = [], conversaciones = [], fallarContactos = false } = {}) {
  const estado = { contactos: [...contactos], conversaciones: [...conversaciones] };
  return {
    estado,
    async query(sql, params = []) {
      const s = sql.replace(/\s+/g, ' ');
      if (s.includes('whatsapp_contactos') && fallarContactos) {
        throw new Error("Table 'hyper.whatsapp_contactos' doesn't exist");
      }
      if (s.includes('INSERT INTO whatsapp_contactos')) {
        const [phone_number_id, phone_number, full_name, first_name] = params;
        const existente = estado.contactos.find((c) => c.phone_number_id === phone_number_id && c.phone_number === phone_number);
        if (existente) Object.assign(existente, { full_name, first_name });
        else estado.contactos.push({ phone_number_id, phone_number, full_name, first_name });
        return [{}];
      }
      if (s.includes('DELETE FROM whatsapp_contactos')) {
        const [pnid, tel] = params;
        estado.contactos = estado.contactos.filter((c) => !(c.phone_number_id === pnid && c.phone_number === tel));
        return [{}];
      }
      if (s.includes('UPDATE whatsapp_conversations SET user_name')) {
        const [nombre, tel, pnid] = params;
        const afectadas = estado.conversaciones.filter((c) => c.phone_number === tel && (c.phone_number_id === pnid || c.phone_number_id == null));
        afectadas.forEach((c) => { c.user_name = nombre; });
        return [{ affectedRows: afectadas.length }];
      }
      throw new Error(`SQL no esperado en el test: ${s}`);
    },
  };
}

const PNID = '106540352242922';
const cuentaOk = async (pnid) => (pnid === PNID ? { id_nodo: 7 } : null);

// Estructura EXACTA de la doc de Meta (smb_app_state_sync).
const altaDeMeta = {
  type: 'contact',
  contact: { full_name: 'Pablo Morales', first_name: 'Pablo', phone_number: '16505551234' },
  action: 'add',
  metadata: { timestamp: '1739321024' },
};

test('alta: guarda el contacto y renombra la conversación existente con el nombre de la agenda', async () => {
  const db = crearDb({
    conversaciones: [{ id: 1, phone_number: '16505551234', phone_number_id: PNID, user_name: null }],
  });
  const r = await procesarContactos([altaDeMeta], PNID, { db, getCuenta: cuentaOk });

  assert.deepEqual(r, { guardados: 1, eliminados: 0, ignorados: 0, conversacionesActualizadas: 1 });
  assert.deepEqual(db.estado.contactos, [
    { phone_number_id: PNID, phone_number: '16505551234', full_name: 'Pablo Morales', first_name: 'Pablo' },
  ]);
  assert.equal(db.estado.conversaciones[0].user_name, 'Pablo Morales');
});

test('alta sin conversación: solo guarda el contacto', async () => {
  const db = crearDb();
  const r = await procesarContactos([altaDeMeta], PNID, { db, getCuenta: cuentaOk });
  assert.equal(r.guardados, 1);
  assert.equal(r.conversacionesActualizadas, 0);
  assert.equal(db.estado.contactos.length, 1);
});

test('edición (add de un contacto existente) actualiza, no duplica', async () => {
  const db = crearDb();
  await procesarContactos([altaDeMeta], PNID, { db, getCuenta: cuentaOk });
  const editado = { ...altaDeMeta, contact: { ...altaDeMeta.contact, full_name: 'Pablo M. (cliente)', first_name: 'Pablo' } };
  await procesarContactos([editado], PNID, { db, getCuenta: cuentaOk });

  assert.equal(db.estado.contactos.length, 1);
  assert.equal(db.estado.contactos[0].full_name, 'Pablo M. (cliente)');
});

test('remove: borra el contacto pero NO toca el nombre de la conversación', async () => {
  const db = crearDb({
    contactos: [{ phone_number_id: PNID, phone_number: '16505551234', full_name: 'Pablo Morales', first_name: 'Pablo' }],
    conversaciones: [{ id: 1, phone_number: '16505551234', phone_number_id: PNID, user_name: 'Pablo Morales' }],
  });
  const baja = { type: 'contact', contact: { phone_number: '16505551234' }, action: 'remove', metadata: { timestamp: '1739321999' } };
  const r = await procesarContactos([baja], PNID, { db, getCuenta: cuentaOk });

  assert.deepEqual(r, { guardados: 0, eliminados: 1, ignorados: 0, conversacionesActualizadas: 0 });
  assert.equal(db.estado.contactos.length, 0);
  assert.equal(db.estado.conversaciones[0].user_name, 'Pablo Morales');
});

test('normaliza el teléfono a dígitos (+, espacios, guiones)', async () => {
  const db = crearDb();
  const raro = { ...altaDeMeta, contact: { ...altaDeMeta.contact, phone_number: '+54 9 223 537-3037' } };
  await procesarContactos([raro], PNID, { db, getCuenta: cuentaOk });
  assert.equal(db.estado.contactos[0].phone_number, '5492235373037');
});

test('phone_number_id sin cuenta activa: no escribe nada', async () => {
  const db = crearDb();
  const r = await procesarContactos([altaDeMeta], 'otro', { db, getCuenta: cuentaOk });
  assert.deepEqual(r, { guardados: 0, eliminados: 0, ignorados: 1, conversacionesActualizadas: 0 });
  assert.equal(db.estado.contactos.length, 0);
});

test('items inválidos (sin teléfono, acción rara, otro type) se ignoran sin romper el lote', async () => {
  const db = crearDb();
  const r = await procesarContactos(
    [
      { type: 'contact', contact: {}, action: 'add' },
      { ...altaDeMeta, action: 'edit' },
      { ...altaDeMeta, type: 'otro' },
      altaDeMeta,
    ],
    PNID,
    { db, getCuenta: cuentaOk }
  );
  assert.equal(r.guardados, 1);
  assert.equal(r.ignorados, 3);
});

test('si la tabla no existe todavía, no lanza: cuenta como ignorado y el webhook sigue', async () => {
  const db = crearDb({ fallarContactos: true });
  const r = await procesarContactos([altaDeMeta, altaDeMeta], PNID, { db, getCuenta: cuentaOk });
  assert.equal(r.guardados, 0);
  assert.equal(r.ignorados, 2);
});
