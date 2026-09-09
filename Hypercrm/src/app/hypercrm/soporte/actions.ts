"use server";

import { cookies } from "next/headers";
import { formatearDestinoWhatsAppAR } from "@/lib/whatsappPhone";

// Todas las acciones de esta pantalla operan sobre el nodo activo del
// operador (cookie que setea el login de Hypercrm, no confundir con las
// cookies "hyperisp_active_*" que usa el login de Hyperisp).
async function getIdNodoActivo(): Promise<number> {
  const cookieStore = await cookies();
  return parseInt(cookieStore.get("hyperisp_active_node_id")?.value || "1", 10);
}

// Ficha CRM del cliente: se consulta directo al backend Java (API3) del nodo
// dueño de la conversación, igual que hace el bot (nodo.endpoint + nodo.token
// como Bearer). No depende de cookies de sesión de Hyperisp.
export async function getClienteByCelular(celular: string) {
  try {
    const idNodo = await getIdNodoActivo();
    const { default: pool } = await import('@/lib/db');
    const [nodoRows]: any = await pool.query('SELECT endpoint, token FROM nodo WHERE id = ?', [idNodo]);

    if (!nodoRows || nodoRows.length === 0 || !nodoRows[0].endpoint) {
      return { error: 'El nodo activo no tiene endpoint de API (Java) configurado.' };
    }
    const { endpoint, token } = nodoRows[0];

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(
      `${String(endpoint).replace(/\/$/, '')}/clientes?celular=${encodeURIComponent(celular)}`,
      { method: 'GET', headers, cache: 'no-store' }
    );

    if (!response.ok) {
      return { error: `No se encontró cliente con celular ${celular} en el nodo activo.` };
    }

    const data = await response.json();
    return { data };
  } catch (error: any) {
    console.error("Error al obtener cliente por celular:", error);
    return { error: "Error de comunicación con el backend del nodo." };
  }
}

// Bandeja: lee conversaciones y mensajes reales de whatsapp_conversations /
// whatsapp_messages (lo que efectivamente escribe el webhook de Meta), no de
// la tabla legacy wapp_mensajes que usaba el bot de Telegram.
export async function getChatsOmnicanal() {
  try {
    const idNodo = await getIdNodoActivo();
    const { default: pool } = await import('@/lib/db');

    const [convRows]: any = await pool.query(
      `SELECT id, phone_number, user_name, escalated_to_agent, last_message_at
       FROM whatsapp_conversations
       WHERE id_nodo = ?
       ORDER BY last_message_at DESC
       LIMIT 50`,
      [idNodo]
    );

    if (!convRows || convRows.length === 0) return { chats: [] };

    const fmtHora = (d: any) => d ? new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';

    const chats = await Promise.all(convRows.map(async (conv: any) => {
      const [msgRows]: any = await pool.query(
        `SELECT id, direction, message_type, content, status, created_at
         FROM whatsapp_messages
         WHERE conversation_id = ?
         ORDER BY id ASC
         LIMIT 200`,
        [conv.id]
      );

      // "No leído" = mensajes entrantes posteriores a la última respuesta
      // saliente (no hay columna "leido" en este esquema, a diferencia de
      // la tabla legacy wapp_mensajes).
      let lastOutboundAt: Date | null = null;
      for (let i = msgRows.length - 1; i >= 0; i--) {
        if (msgRows[i].direction === 'OUTBOUND') { lastOutboundAt = new Date(msgRows[i].created_at); break; }
      }
      const unread = msgRows.filter((m: any) =>
        m.direction === 'INBOUND' && (!lastOutboundAt || new Date(m.created_at) > lastOutboundAt)
      ).length;

      const messages = msgRows.map((m: any) => ({
        id: String(m.id),
        sender: m.direction === 'INBOUND' ? 'client' : 'agent',
        text: m.content || (m.message_type ? `[Adjunto: ${m.message_type}]` : ''),
        time: fmtHora(m.created_at),
        read: m.direction === 'INBOUND' ? true : m.status === 'READ',
      }));

      const ultimo = msgRows[msgRows.length - 1];
      const nombreOTelefono = conv.user_name || conv.phone_number;

      return {
        id: String(conv.id),
        name: nombreOTelefono,
        phone: conv.phone_number,
        avatar: String(nombreOTelefono).substring(0, 2).toUpperCase(),
        channel: 'whatsapp',
        lastMessage: ultimo?.content || (ultimo ? `[Adjunto: ${ultimo.message_type}]` : ''),
        time: fmtHora(conv.last_message_at),
        unread,
        botActive: !conv.escalated_to_agent,
        messages,
      };
    }));

    return { chats };
  } catch (err) {
    console.error("Error al obtener conversaciones de WhatsApp:", err);
    return { chats: [] };
  }
}

// Historial de llamadas por WhatsApp (Calling API vía SIP) del nodo activo.
// Alimentado por el webhook (field "calls") en whatsapp-webhooks/messages;
// esta acción solo lee lo que ya quedó guardado en crm_llamadas.
export async function getLlamadasRecientes() {
  try {
    const idNodo = await getIdNodoActivo();
    const { default: pool } = await import('@/lib/db');

    const [rows]: any = await pool.query(
      `SELECT c.id, c.wa_call_id, c.phone_number, c.direction, c.status,
              c.start_time, c.end_time, c.duration_seconds, c.created_at,
              conv.user_name
       FROM crm_llamadas c
       LEFT JOIN whatsapp_conversations conv ON conv.id = c.conversation_id
       WHERE c.id_nodo = ?
       ORDER BY c.created_at DESC
       LIMIT 50`,
      [idNodo]
    );

    return {
      llamadas: (rows || []).map((r: any) => ({
        id: String(r.id),
        waCallId: r.wa_call_id,
        phone: r.phone_number,
        name: r.user_name || r.phone_number,
        direction: r.direction as 'INBOUND' | 'OUTBOUND',
        status: r.status as string | null,
        durationSeconds: r.duration_seconds as number | null,
        startedAt: r.start_time,
        endedAt: r.end_time,
      })),
    };
  } catch (err) {
    console.error("Error al obtener llamadas de WhatsApp:", err);
    return { llamadas: [] };
  }
}

// Envío manual del operador desde la bandeja. Se resuelve acá directo (DB +
// Meta) en vez de pegarle por HTTP a /api/whatsapp-send-message: esta acción
// ya corre server-side en el mismo proceso, y un self-fetch dependería de
// NEXT_PUBLIC_APP_URL, que no está configurado en .env.local (caería a
// localhost:3001, casi seguro incorrecto en producción).
export async function enviarMensajeMeta(_chatId: string, phone: string, message: string) {
  try {
    const idNodo = await getIdNodoActivo();
    const { default: pool } = await import('@/lib/db');

    const [cuentaRows]: any = await pool.query(
      `SELECT identificador, token FROM crm_cuentas
       WHERE id_nodo = ? AND canal = 'whatsapp' AND activo = 1 LIMIT 1`,
      [idNodo]
    );
    if (!cuentaRows || cuentaRows.length === 0) {
      return { success: false, error: 'No hay número de WhatsApp configurado para este nodo.' };
    }
    const phoneNumberId = cuentaRows[0].identificador;
    const token = cuentaRows[0].token;

    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', recipient_type: 'individual', to: formatearDestinoWhatsAppAR(phone),
        type: 'text', text: { preview_url: false, body: message },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.messages) {
      console.error('[SOPORTE] Error de Meta enviando respuesta manual:', data);
      return { success: false, error: 'Meta rechazó el envío.' };
    }
    const wabaMessageId: string | null = data.messages[0]?.id || null;

    const [convRows]: any = await pool.query(
      `SELECT id FROM whatsapp_conversations WHERE id_nodo = ? AND phone_number = ? LIMIT 1`,
      [idNodo, phone]
    );
    const conversationId = convRows?.[0]?.id || null;

    await pool.query(
      `INSERT INTO whatsapp_messages
       (id_nodo, conversation_id, phone_number, direction, message_type, content, waba_message_id, status)
       VALUES (?, ?, ?, 'OUTBOUND', 'text', ?, ?, 'SENT')`,
      [idNodo, conversationId, phone, message, wabaMessageId]
    );

    // Un humano acaba de escribirle a este cliente: el bot deja de
    // contestarle en esta conversación hasta que alguien la reabra.
    if (conversationId) {
      await pool.query(
        `UPDATE whatsapp_conversations SET last_message_at = NOW(), escalated_to_agent = 1 WHERE id = ?`,
        [conversationId]
      );
    }

    return { success: true };
  } catch (err) {
    console.error("Error enviando mensaje manual de WhatsApp:", err);
    return { success: false, error: 'Excepción al enviar.' };
  }
}
