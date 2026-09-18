// Coexistence: mensajes que el negocio manda DESDE la app WhatsApp Business del
// celular llegan por el webhook como field "smb_message_echoes"
// (value.message_echoes[]). A diferencia de un mensaje entrante, acá `from` es
// el número del NEGOCIO y `to` es el cliente. Los mensajes enviados por la
// Cloud API no generan echo, así que no hay riesgo de duplicar lo que manda el
// CRM (aunque un reintento del webhook sí puede repetir el mismo echo).

export interface DbLike {
  query(sql: string, params?: any[]): Promise<any>;
}

export interface EchoDeps {
  db: DbLike;
  getCuenta(phoneNumberId: string): Promise<{ id_nodo: number } | null>;
}

export interface ResultadoEchos {
  guardados: number;
  duplicados: number;
  ignorados: number;
}

export function contenidoDeMensaje(msg: any): { tipo: string; contenido: string } {
  const tipo: string = msg?.type || 'unknown';
  if (tipo === 'text') return { tipo, contenido: msg.text?.body || '' };
  if (tipo === 'interactive') {
    const boton = msg.interactive?.button_reply;
    const fila = msg.interactive?.list_reply;
    return { tipo, contenido: boton?.title || fila?.title || 'Interactive message' };
  }
  return { tipo, contenido: `[Adjunto: ${tipo}]` };
}

export async function procesarEchos(
  echoes: any[],
  phoneNumberId: string,
  { db, getCuenta }: EchoDeps
): Promise<ResultadoEchos> {
  const resultado: ResultadoEchos = { guardados: 0, duplicados: 0, ignorados: 0 };

  const cuenta = await getCuenta(phoneNumberId);
  if (!cuenta) {
    console.warn(`[WHATSAPP-WEBHOOK] Echo ignorado: no hay crm_cuentas activa para phone_number_id ${phoneNumberId}`);
    resultado.ignorados = echoes.length;
    return resultado;
  }

  for (const echo of echoes) {
    const cliente: string | undefined = echo?.to;
    const messageId: string | undefined = echo?.id;
    if (!cliente || !messageId) {
      resultado.ignorados++;
      continue;
    }

    // Meta no promete que un echo no se repita (reintentos): se dedupea por id.
    const [dup]: any = await db.query(
      `SELECT id FROM whatsapp_messages WHERE waba_message_id = ? LIMIT 1`,
      [messageId]
    );
    if (dup && dup.length > 0) {
      resultado.duplicados++;
      continue;
    }

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
      if (!conversaciones[0].phone_number_id) {
        await db.query(`UPDATE whatsapp_conversations SET phone_number_id = ? WHERE id = ?`, [phoneNumberId, conversationId]);
      }
    } else {
      // Un operador le escribió primero a un cliente desde el celular. Se crea
      // la conversación en la ciudad principal de la cuenta y NO se dispara la
      // desambiguación de ciudad: no tiene sentido que el CRM le mande un
      // "¿sobre cuál ciudad?" automático a alguien a quien un humano recién
      // le escribió a mano.
      idNodo = cuenta.id_nodo;
      const [insert]: any = await db.query(
        `INSERT INTO whatsapp_conversations (id_nodo, phone_number, phone_number_id, first_message_at)
         VALUES (?, ?, ?, NOW())`,
        [idNodo, cliente, phoneNumberId]
      );
      conversationId = insert.insertId;
    }

    const { tipo, contenido } = contenidoDeMensaje(echo);
    await db.query(
      `INSERT INTO whatsapp_messages
       (id_nodo, conversation_id, phone_number, direction, message_type, content, waba_message_id, status)
       VALUES (?, ?, ?, 'OUTBOUND', ?, ?, ?, 'SENT')`,
      [idNodo, conversationId, cliente, tipo, contenido, messageId]
    );

    // Igual que cuando contesta un operador desde el CRM: un humano tomó la
    // conversación, el bot deja de intervenir.
    await db.query(
      `UPDATE whatsapp_conversations SET last_message_at = NOW(), escalated_to_agent = 1 WHERE id = ?`,
      [conversationId]
    );

    resultado.guardados++;
    console.log(`✅ Echo (mensaje desde la app del celular) guardado para ${cliente} en conversación ${conversationId}`);
  }

  return resultado;
}
