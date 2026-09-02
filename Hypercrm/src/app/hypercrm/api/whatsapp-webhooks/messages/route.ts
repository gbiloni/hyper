import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';

const DEFAULT_VERIFY_TOKEN = 'hyperisp_meta_2026';

// Webhook verification from Meta
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Webhook verified by Meta (whatsapp-webhooks/messages)');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('❌ Webhook verification failed (whatsapp-webhooks/messages)');
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}

// Receive messages from Meta
export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-hub-signature-256') || '';
    const rawBody = await req.text();

    const appSecret = process.env.META_APP_SECRET;
    if (appSecret && signature) {
      const expectedSig = signature.substring(7); // quita el prefijo "sha256="
      const hash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
      if (hash !== expectedSig) {
        console.warn('❌ Firma HMAC inválida en whatsapp-webhooks/messages');
        return NextResponse.json({ error: 'invalid_signature' }, { status: 403 });
      }
    }

    const body = JSON.parse(rawBody);

    // Log webhook event
    console.log('📨 Webhook received:', JSON.stringify(body, null, 2));

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ received: true });
    }

    // Responder rápido a Meta (fire and forget): guardar en la BD y evaluar
    // el bot implican llamadas de red/DB que no deben demorar el ACK.
    procesarPayloadAsincrono(body).catch((err) =>
      console.error('❌ Error procesando payload asíncrono de whatsapp-webhooks/messages:', err)
    );

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json({ received: true }); // Return OK to prevent retries
  }
}

async function procesarPayloadAsincrono(body: any) {
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id || '';

      // Process incoming messages
      if (value.messages && value.messages.length > 0) {
        for (const message of value.messages) {
          await handleIncomingMessage(message, phoneNumberId);
        }
      }

      // Process message status updates
      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          await handleMessageStatus(status);
        }
      }
    }
  }
}

// Busca a qué nodo/cuenta pertenece un phone_number_id (multi-tenant real).
async function getCuentaByPhoneNumberId(phoneNumberId: string): Promise<{ id_nodo: number; token: string } | null> {
  if (!phoneNumberId) return null;
  const [rows]: any = await db.query(
    `SELECT id_nodo, token FROM crm_cuentas
     WHERE identificador = ? AND canal = 'whatsapp' AND activo = 1
     LIMIT 1`,
    [phoneNumberId]
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

async function handleIncomingMessage(message: any, phoneNumberId: string) {
  try {
    const phoneNumber = message.from;
    const messageId = message.id;
    const type = message.type; // text, interactive, etc.

    let messageContent = '';
    if (type === 'text') messageContent = message.text?.body || '';
    else if (type === 'interactive') messageContent = message.interactive?.button_reply?.title || 'Interactive message';
    else messageContent = `[Adjunto: ${type}]`;

    // Resolver el nodo dueño de este número. Sin esto, todo se guardaba
    // (incorrectamente) bajo el nodo 1 sin importar quién lo recibió.
    const cuenta = await getCuentaByPhoneNumberId(phoneNumberId);
    if (!cuenta) {
      console.warn(`[WHATSAPP-WEBHOOK] No se encontró crm_cuentas activa para phone_number_id ${phoneNumberId}`);
      return;
    }
    const { id_nodo: idNodo, token } = cuenta;

    // Get or create conversation
    const [conversations]: any = await db.query(
      `SELECT id, escalated_to_agent FROM whatsapp_conversations
       WHERE id_nodo = ? AND phone_number = ?
       LIMIT 1`,
      [idNodo, phoneNumber]
    );

    let conversationId: number;
    let escalated = false;
    if (conversations.length > 0) {
      conversationId = conversations[0].id;
      escalated = !!conversations[0].escalated_to_agent;
    } else {
      const [result]: any = await db.query(
        `INSERT INTO whatsapp_conversations (id_nodo, phone_number, first_message_at)
         VALUES (?, ?, NOW())`,
        [idNodo, phoneNumber]
      );
      conversationId = result.insertId;
    }

    // Save message
    await db.query(
      `INSERT INTO whatsapp_messages
       (id_nodo, conversation_id, phone_number, direction, message_type, content, waba_message_id, status)
       VALUES (?, ?, ?, 'INBOUND', ?, ?, ?, 'DELIVERED')`,
      [idNodo, conversationId, phoneNumber, type, messageContent, messageId]
    );

    // Update conversation
    await db.query(
      `UPDATE whatsapp_conversations SET last_message_at = NOW() WHERE id = ?`,
      [conversationId]
    );

    console.log(`✅ Message saved from ${phoneNumber} in conversation ${conversationId} (nodo ${idNodo})`);

    // Bot automático: solo si la conversación no fue escalada a un agente humano.
    // El flujo termina acá: hypercrm guarda y (si corresponde) contesta.
    // No se reenvía nada a los nodos — ellos leen/escriben directo contra
    // esta misma base (hyper) según los números y permisos que tengan.
    if (!escalated) {
      await evaluarBot(idNodo, phoneNumberId, phoneNumber, messageContent, conversationId, token);
    }

  } catch (error) {
    console.error('❌ Error handling incoming message:', error);
  }
}

// Motor de bot: evalúa las reglas de crm_bot_config para el nodo dueño del
// número que recibió el mensaje, y si hay una keyword activa que matchea,
// contesta automáticamente y lo registra como mensaje OUTBOUND.
async function evaluarBot(idNodo: number, phoneNumberId: string, remitente: string, texto: string, conversationId: number, token: string) {
  if (!texto) return;
  try {
    const [reglaRows]: any = await db.query(
      `SELECT respuesta FROM crm_bot_config
       WHERE id_nodo = ? AND (canal = 'whatsapp' OR canal = 'all') AND activo = 1
         AND LOWER(?) LIKE CONCAT('%', LOWER(pregunta), '%')
       ORDER BY orden ASC
       LIMIT 1`,
      [idNodo, texto]
    );
    if (!reglaRows || reglaRows.length === 0) return; // Sin match: queda para el agente humano.

    const respuesta: string = reglaRows[0].respuesta;

    const enviado = await sendWhatsAppTextReply(phoneNumberId, remitente, respuesta, token);
    if (enviado) {
      await db.query(
        `INSERT INTO whatsapp_messages
         (id_nodo, conversation_id, phone_number, direction, message_type, content, status)
         VALUES (?, ?, ?, 'OUTBOUND', 'text', ?, 'SENT')`,
        [idNodo, conversationId, remitente, respuesta]
      );
      await db.query(`UPDATE whatsapp_conversations SET last_message_at = NOW() WHERE id = ?`, [conversationId]);
    }
  } catch (error) {
    console.error('[BOT] Error evaluando/enviando respuesta automática:', error);
  }
}

async function sendWhatsAppTextReply(phoneNumberId: string, to: string, texto: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: texto },
      }),
    });
    const data = await res.json();
    if (res.ok && data.messages) return true;
    console.error('[BOT] Error de Meta enviando respuesta:', data);
    return false;
  } catch (err) {
    console.error('[BOT] Excepción enviando respuesta:', err);
    return false;
  }
}

async function handleMessageStatus(status: any) {
  try {
    const messageId = status.id;
    const statusValue = status.status; // 'sent', 'delivered', 'read', 'failed'

    let statusEnum = 'SENT';
    if (statusValue === 'delivered') statusEnum = 'DELIVERED';
    if (statusValue === 'read') statusEnum = 'READ';
    if (statusValue === 'failed') statusEnum = 'FAILED';

    const [result]: any = await db.query(
      `UPDATE whatsapp_messages SET status = ?, updated_at = NOW()
       WHERE waba_message_id = ?`,
      [statusEnum, messageId]
    );

    if (result.affectedRows > 0) {
      console.log(`✅ Message ${messageId} status updated to ${statusEnum}`);
    }

  } catch (error) {
    console.error('❌ Error handling message status:', error);
  }
}
