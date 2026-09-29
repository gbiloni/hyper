// Coexistence: historial de chats de la WhatsApp Business App. Llega por el
// webhook como field "history" (value.history[]) después de pedirlo una vez con
// smb_app_data (whatsappSyncInicial.ts). Cada item es:
//   { metadata: { phase, chunk_order, progress },
//     threads: [ { id: <teléfono del cliente>,
//                  messages: [ { from, to?, id, timestamp, type, <type>: {...},
//                                history_context: { status } } ] } ] }
// o, si el negocio NO aceptó compartir el historial:
//   { errors: [ { code: 2593109, ... } ] }
//
// Detalles de Meta que se respetan acá:
//   - Hasta 180 días, en fases (0: día 0-1, 1: día 1-90, 2: día 90-180) y en
//     chunks que pueden llegar desordenados: por eso cada mensaje se guarda con
//     su timestamp original en created_at, no con NOW().
//   - `from` es el cliente (entrante) o el negocio (saliente).
//   - Los mensajes con adjunto llegan primero como type "media_placeholder" sin
//     contenido; después (solo si son de los últimos 14 días) llega otro
//     webhook con el MISMO id y el contenido real, que reemplaza al placeholder.
//   - Un webhook puede traer miles de mensajes: se trabaja por hilo (1 SELECT
//     de duplicados + 1 INSERT masivo), y el route lo corre después de
//     responderle 200 a Meta.
// No toca el bot: son mensajes viejos, no dispara flujos ni escala a operador.

import type { DbLike } from './whatsappEchoes';
import { contenidoDeMensaje } from './whatsappEchoes';

export interface HistorialDeps {
  db: DbLike;
  getCuenta(phoneNumberId: string): Promise<{ id_nodo: number } | null>;
}

export interface ResultadoHistorial {
  guardados: number;
  duplicados: number;
  adjuntosCompletados: number;
  ignorados: number;
  rechazado: boolean;
  progreso: number | null;
}

const CODIGO_HISTORIAL_NO_COMPARTIDO = 2593109;
const PLACEHOLDER = 'media_placeholder';

function estadoDeHistorial(status: unknown): string {
  switch (String(status || '').toUpperCase()) {
    case 'READ':
    case 'PLAYED':
      return 'READ';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'ERROR':
      return 'FAILED';
    default:
      return 'SENT';
  }
}

function contenido(msg: any): { tipo: string; contenido: string } {
  if (msg?.type === PLACEHOLDER) return { tipo: PLACEHOLDER, contenido: '[Adjunto]' };
  return contenidoDeMensaje(msg);
}

export async function procesarHistorial(
  items: any[],
  phoneNumberId: string,
  { db, getCuenta }: HistorialDeps
): Promise<ResultadoHistorial> {
  const r: ResultadoHistorial = { guardados: 0, duplicados: 0, adjuntosCompletados: 0, ignorados: 0, rechazado: false, progreso: null };

  const cuenta = await getCuenta(phoneNumberId);
  if (!cuenta) {
    console.warn(`[WHATSAPP-HISTORY] Historial ignorado: no hay crm_cuentas activa para phone_number_id ${phoneNumberId}`);
    return r;
  }

  for (const item of items) {
    if (Array.isArray(item?.errors) && item.errors.length > 0) {
      const e = item.errors[0];
      if (Number(e?.code) === CODIGO_HISTORIAL_NO_COMPARTIDO) {
        r.rechazado = true;
        console.log(`[WHATSAPP-HISTORY] ${phoneNumberId}: el negocio no aceptó compartir el historial de chats`);
      } else {
        console.error(`[WHATSAPP-HISTORY] ${phoneNumberId}: error de Meta en el historial:`, JSON.stringify(item.errors));
      }
      continue;
    }

    const progreso = Number(item?.metadata?.progress);
    if (Number.isFinite(progreso)) r.progreso = Math.max(r.progreso ?? 0, progreso);

    for (const thread of item?.threads ?? []) {
      // Un hilo con problemas no frena al resto del lote.
      try {
        await procesarHilo(thread, phoneNumberId, cuenta.id_nodo, db, r);
      } catch (error: any) {
        console.error(`[WHATSAPP-HISTORY] Error guardando el hilo ${thread?.id}:`, error?.message);
        r.ignorados += Array.isArray(thread?.messages) ? thread.messages.length : 0;
      }
    }
  }

  console.log(
    `✅ history ${phoneNumberId}: ${r.guardados} guardado(s), ${r.duplicados} duplicado(s), ` +
      `${r.adjuntosCompletados} adjunto(s) completado(s), ${r.ignorados} ignorado(s)` +
      (r.progreso !== null ? `, progreso ${r.progreso}%` : '')
  );
  return r;
}

async function procesarHilo(thread: any, phoneNumberId: string, idNodoCuenta: number, db: DbLike, r: ResultadoHistorial) {
  const cliente = String(thread?.id ?? '').replace(/\D/g, '');
  const mensajes: any[] = Array.isArray(thread?.messages) ? thread.messages : [];
  const validos = mensajes.filter((m) => m?.id && Number(m?.timestamp) > 0);
  r.ignorados += mensajes.length - validos.length;
  if (!cliente || validos.length === 0) {
    if (!cliente) r.ignorados += validos.length;
    return;
  }

  // Duplicados (reintentos de Meta, o el segundo webhook de un adjunto).
  const ids = validos.map((m) => String(m.id));
  const [existentes]: any = await db.query(
    `SELECT waba_message_id, message_type FROM whatsapp_messages WHERE waba_message_id IN (?)`,
    [ids]
  );
  const yaEstan = new Map<string, string>((existentes ?? []).map((e: any) => [e.waba_message_id, e.message_type]));

  const nuevos: any[] = [];
  const vistos = new Set<string>();
  for (const m of validos) {
    const id = String(m.id);
    const tipoExistente = yaEstan.get(id);
    if (tipoExistente !== undefined || vistos.has(id)) {
      if (tipoExistente === PLACEHOLDER && m.type !== PLACEHOLDER) {
        const { tipo, contenido: texto } = contenido(m);
        await db.query(
          `UPDATE whatsapp_messages SET message_type = ?, content = ? WHERE waba_message_id = ? AND message_type = ?`,
          [tipo, texto, id, PLACEHOLDER]
        );
        r.adjuntosCompletados++;
      } else {
        r.duplicados++;
      }
      continue;
    }
    vistos.add(id);
    nuevos.push(m);
  }
  if (nuevos.length === 0) return;

  const tiempos = nuevos.map((m) => Number(m.timestamp));
  const primero = Math.min(...tiempos);
  const ultimo = Math.max(...tiempos);

  const [conversaciones]: any = await db.query(
    `SELECT id, id_nodo, phone_number_id FROM whatsapp_conversations
     WHERE phone_number = ? AND (phone_number_id = ? OR phone_number_id IS NULL)
     LIMIT 1`,
    [cliente, phoneNumberId]
  );

  let conversationId: number;
  let idNodo: number;
  if (conversaciones && conversaciones.length > 0) {
    conversationId = conversaciones[0].id;
    idNodo = conversaciones[0].id_nodo;
    await db.query(
      `UPDATE whatsapp_conversations
          SET phone_number_id = COALESCE(phone_number_id, ?),
              first_message_at = LEAST(COALESCE(first_message_at, FROM_UNIXTIME(?)), FROM_UNIXTIME(?)),
              last_message_at = GREATEST(COALESCE(last_message_at, FROM_UNIXTIME(?)), FROM_UNIXTIME(?))
        WHERE id = ?`,
      [phoneNumberId, primero, primero, ultimo, ultimo, conversationId]
    );
  } else {
    // Igual que con los echoes: sin flow_state ni pregunta de ciudad, en la
    // ciudad principal de la cuenta.
    idNodo = idNodoCuenta;
    const [insert]: any = await db.query(
      `INSERT INTO whatsapp_conversations (id_nodo, phone_number, phone_number_id, first_message_at, last_message_at)
       VALUES (?, ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?))`,
      [idNodo, cliente, phoneNumberId, primero, ultimo]
    );
    conversationId = insert.insertId;
  }

  const filas = nuevos.map((m) => {
    const entrante = String(m.from ?? '').replace(/\D/g, '') === cliente;
    const { tipo, contenido: texto } = contenido(m);
    return [
      idNodo,
      conversationId,
      cliente,
      entrante ? 'INBOUND' : 'OUTBOUND',
      tipo,
      texto,
      String(m.id),
      entrante ? 'DELIVERED' : estadoDeHistorial(m.history_context?.status),
      Number(m.timestamp),
    ];
  });
  await db.query(
    `INSERT INTO whatsapp_messages
     (id_nodo, conversation_id, phone_number, direction, message_type, content, waba_message_id, status, created_at)
     VALUES ${filas.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))').join(', ')}`,
    filas.flat()
  );
  r.guardados += filas.length;
}
