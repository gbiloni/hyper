import { NextResponse } from 'next/server';
import { GRAPH_VERSION } from '@/lib/metaGraph';
import crypto from 'crypto';
import db from '@/lib/db';
import { formatearDestinoWhatsAppAR } from '@/lib/whatsappPhone';
import { procesarEchos } from '@/lib/whatsappEchoes';
import { procesarContactos } from '@/lib/whatsappContactos';
import { procesarHistorial } from '@/lib/whatsappHistorial';

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

    // Log webhook event. El historial (field "history") puede traer miles de
    // mensajes viejos de clientes: no se vuelca entero al log.
    const esHistorial = body.entry?.some((e: any) => e.changes?.some((c: any) => c.field === 'history'));
    console.log('📨 Webhook received:', esHistorial ? '(history — detalle omitido por tamaño)' : JSON.stringify(body, null, 2));

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

      // Coexistence: mensajes que el negocio manda desde la app del celular
      // (field "smb_message_echoes"). Se guardan como OUTBOUND en el hilo.
      if (value.message_echoes && value.message_echoes.length > 0) {
        await procesarEchos(value.message_echoes, phoneNumberId, {
          db,
          getCuenta: getCuentaByPhoneNumberId,
        });
      }

      // Coexistence: agenda de la app del celular (field "smb_app_state_sync").
      // Se guarda en whatsapp_contactos y se usa el nombre en Soporte.
      if (value.state_sync && value.state_sync.length > 0) {
        await procesarContactos(value.state_sync, phoneNumberId, {
          db,
          getCuenta: getCuentaByPhoneNumberId,
        });
      }

      // Coexistence: historial de chats de la app del celular (field
      // "history"). Puede traer miles de mensajes; como todo este bloque, corre
      // después de responderle 200 a Meta. Un reintento no duplica (se dedupea
      // por id).
      if (value.history && value.history.length > 0) {
        await procesarHistorial(value.history, phoneNumberId, {
          db,
          getCuenta: getCuentaByPhoneNumberId,
        });
      }

      // Process calling events (Calling API vía SIP: field "calls",
      // eventos call_created/terminate — mismo webhook que los mensajes)
      if (value.calls && value.calls.length > 0) {
        for (const call of value.calls) {
          await handleCallEvent(call, phoneNumberId);
        }
      }
    }
  }
}

interface CiudadVinculada {
  id_nodo: number;
  nombre: string | null;
  endpoint: string | null;
  token: string | null; // token del backend Java del nodo (API3), no el de Meta
}

// Busca a qué cuenta pertenece un phone_number_id, y a qué ciudades (nodos)
// está vinculada esa cuenta (multi-tenant real -- un mismo número puede
// atender más de una ciudad, ver crm_cuentas_nodos).
async function getCuentaByPhoneNumberId(phoneNumberId: string): Promise<{ id: number; id_nodo: number; token: string; ciudades: CiudadVinculada[] } | null> {
  if (!phoneNumberId) return null;
  const [rows]: any = await db.query(
    `SELECT id, id_nodo, token FROM crm_cuentas
     WHERE identificador = ? AND canal = 'whatsapp' AND activo = 1
     LIMIT 1`,
    [phoneNumberId]
  );
  if (!rows || rows.length === 0) return null;
  const cuenta = rows[0];

  const [ciudadesRows]: any = await db.query(
    `SELECT n.id AS id_nodo, n.nombre, n.endpoint, n.token
     FROM crm_cuentas_nodos cn JOIN nodo n ON n.id = cn.id_nodo
     WHERE cn.id_cuenta = ? ORDER BY n.id ASC`,
    [cuenta.id]
  );
  // Cuentas creadas antes de crm_cuentas_nodos (o backfill que todavía no
  // corrió): al menos la ciudad "principal" de compatibilidad.
  const ciudades: CiudadVinculada[] = ciudadesRows && ciudadesRows.length > 0
    ? ciudadesRows
    : [{ id_nodo: cuenta.id_nodo, nombre: null, endpoint: null, token: null }];

  return { id: cuenta.id, id_nodo: cuenta.id_nodo, token: cuenta.token, ciudades };
}

// Consulta el backend Java de cada ciudad vinculada a la cuenta para ver en
// cuál existe un cliente con este celular. Se usa una sola vez, al crear la
// conversación -- no en cada mensaje, para no pegarle a N backends por cada
// mensaje que manda el cliente.
type ResolucionCiudad =
  | { tipo: 'resuelta'; id_nodo: number }
  | { tipo: 'ambigua'; opciones: { numero: number; id_nodo: number; nombre: string }[] }
  | { tipo: 'sin_match' };

async function resolverCiudadCliente(ciudades: CiudadVinculada[], phoneNumber: string): Promise<ResolucionCiudad> {
  const resultados = await Promise.all(ciudades.map(async (c) => {
    if (!c.endpoint) return { ...c, encontrado: false };
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (c.token) headers['Authorization'] = `Bearer ${c.token}`;
      const res = await fetch(
        `${c.endpoint.replace(/\/$/, '')}/clientes?celular=${encodeURIComponent(phoneNumber)}`,
        { headers, cache: 'no-store' }
      );
      return { ...c, encontrado: res.ok };
    } catch {
      return { ...c, encontrado: false };
    }
  }));

  const encontrados = resultados.filter((r) => r.encontrado);
  if (encontrados.length === 1) return { tipo: 'resuelta', id_nodo: encontrados[0].id_nodo };
  if (encontrados.length > 1) {
    return {
      tipo: 'ambigua',
      opciones: encontrados.map((c, i) => ({ numero: i + 1, id_nodo: c.id_nodo, nombre: c.nombre || `Ciudad ${c.id_nodo}` })),
    };
  }
  return { tipo: 'sin_match' };
}

function textoListaCiudades(opciones: { numero: number; nombre: string }[]): string {
  return opciones.map((o) => `${o.numero}. ${o.nombre}`).join('\n');
}

// La conversación está esperando que el cliente responda cuál ciudad quiere
// consultar (flow_state.tipo === 'seleccion_ciudad'). Este mensaje entrante
// es, se supone, esa respuesta.
async function manejarSeleccionCiudad(
  opciones: { numero: number; id_nodo: number; nombre: string }[],
  messageContent: string,
  conversationId: number,
  idNodoActual: number,
  phoneNumber: string,
  phoneNumberId: string,
  metaToken: string
) {
  const numero = parseInt((messageContent || '').trim(), 10);
  const elegido = opciones.find((o) => o.numero === numero);

  if (elegido) {
    await db.query(`UPDATE whatsapp_conversations SET id_nodo = ?, flow_state = NULL WHERE id = ?`, [elegido.id_nodo, conversationId]);
    const texto = `Listo, quedaste en *${elegido.nombre}*. ¿En qué te puedo ayudar?`;
    const enviado = await sendWhatsAppTextReply(phoneNumberId, phoneNumber, texto, metaToken);
    if (enviado) {
      await db.query(
        `INSERT INTO whatsapp_messages (id_nodo, conversation_id, phone_number, direction, message_type, content, status)
         VALUES (?, ?, ?, 'OUTBOUND', 'text', ?, 'SENT')`,
        [elegido.id_nodo, conversationId, phoneNumber, texto]
      );
    }
    return;
  }

  // No matcheó ninguna opción: se reenvía la lista, la conversación sigue
  // pendiente (flow_state no se toca).
  const texto = `No entendí tu respuesta. Respondé con el número de la ciudad sobre la que querés consultar:\n${textoListaCiudades(opciones)}`;
  const enviado = await sendWhatsAppTextReply(phoneNumberId, phoneNumber, texto, metaToken);
  if (enviado) {
    await db.query(
      `INSERT INTO whatsapp_messages (id_nodo, conversation_id, phone_number, direction, message_type, content, status)
       VALUES (?, ?, ?, 'OUTBOUND', 'text', ?, 'SENT')`,
      [idNodoActual, conversationId, phoneNumber, texto]
    );
  }
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

    // Resolver la cuenta dueña de este número y las ciudades a las que está
    // vinculada. Sin esto, todo se guardaba (incorrectamente) bajo el nodo 1
    // sin importar quién lo recibió.
    const cuenta = await getCuentaByPhoneNumberId(phoneNumberId);
    if (!cuenta) {
      console.warn(`[WHATSAPP-WEBHOOK] No se encontró crm_cuentas activa para phone_number_id ${phoneNumberId}`);
      return;
    }
    const { id_nodo: idNodoCompat, token, ciudades } = cuenta;

    // Get or create conversation. Se matchea por phone_number + phone_number_id
    // (no por id_nodo: la ciudad de una conversación puede reasignarse
    // después de una desambiguación, ver más abajo) para no mezclar en una
    // misma conversación los mensajes que un mismo cliente le manda a dos
    // números de WhatsApp distintos. Las filas viejas con phone_number_id
    // NULL (previas a esta columna) igual matchean, y se completan al toque.
    const [conversations]: any = await db.query(
      `SELECT id, escalated_to_agent, phone_number_id, id_nodo, flow_state FROM whatsapp_conversations
       WHERE phone_number = ? AND (phone_number_id = ? OR phone_number_id IS NULL)
       LIMIT 1`,
      [phoneNumber, phoneNumberId]
    );

    let conversationId: number;
    let escalated = false;
    let idNodo = idNodoCompat;
    let flowState: any = null;
    let esNueva = false;

    if (conversations.length > 0) {
      conversationId = conversations[0].id;
      escalated = !!conversations[0].escalated_to_agent;
      idNodo = conversations[0].id_nodo;
      flowState = conversations[0].flow_state ? JSON.parse(conversations[0].flow_state) : null;
      if (!conversations[0].phone_number_id) {
        await db.query(`UPDATE whatsapp_conversations SET phone_number_id = ? WHERE id = ?`, [phoneNumberId, conversationId]);
      }
    } else {
      esNueva = true;
      // Solo hace falta desambiguar si la cuenta atiende más de una ciudad.
      // Con una sola, no hay nada que resolver -- mismo comportamiento de
      // siempre.
      if (ciudades.length > 1) {
        const resolucion = await resolverCiudadCliente(ciudades, phoneNumber);
        if (resolucion.tipo === 'resuelta') {
          idNodo = resolucion.id_nodo;
        } else if (resolucion.tipo === 'ambigua') {
          flowState = { tipo: 'seleccion_ciudad', opciones: resolucion.opciones };
          // idNodo se queda en el "principal" (idNodoCompat) mientras se
          // pregunta -- así la conversación no queda huérfana de ciudad.
        }
        // 'sin_match': no hay con qué desambiguar, se sigue con idNodoCompat.
      }

      const [result]: any = await db.query(
        `INSERT INTO whatsapp_conversations (id_nodo, phone_number, phone_number_id, flow_state, first_message_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [idNodo, phoneNumber, phoneNumberId, flowState ? JSON.stringify(flowState) : null]
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

    // Si un agente humano ya tomó la conversación, no lo pisa: se corta acá
    // solo mientras sigue siendo del bot. Una vez escalada, la desambiguación
    // de ciudad pendiente queda en manos del agente (puede reasignarla a
    // mano si hace falta).
    if (!escalated && flowState?.tipo === 'seleccion_ciudad') {
      if (esNueva) {
        // Primera vez que se detecta la ambigüedad: se manda la pregunta.
        const texto = `Encontramos tu número en más de una ciudad. Respondé con el número de la ciudad sobre la que querés consultar:\n${textoListaCiudades(flowState.opciones)}`;
        const enviado = await sendWhatsAppTextReply(phoneNumberId, phoneNumber, texto, token);
        if (enviado) {
          await db.query(
            `INSERT INTO whatsapp_messages (id_nodo, conversation_id, phone_number, direction, message_type, content, status)
             VALUES (?, ?, ?, 'OUTBOUND', 'text', ?, 'SENT')`,
            [idNodo, conversationId, phoneNumber, texto]
          );
        }
      } else {
        // Ya se había preguntado: este mensaje es la respuesta del cliente.
        await manejarSeleccionCiudad(flowState.opciones, messageContent, conversationId, idNodo, phoneNumber, phoneNumberId, token);
      }
      return; // No se evalúa el bot mientras la ciudad no está resuelta.
    }

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

    let respuesta: string = reglaRows[0].respuesta;

    // Si la plantilla necesita datos del cliente (nombre, saldo), se piden al
    // backend Java (API3) del nodo dueño del número — misma convención que ya
    // usa el bot de Telegram (nodo.endpoint + nodo.token como Bearer).
    if (respuesta.includes('{nombre}') || respuesta.includes('{saldo}')) {
      respuesta = await enriquecerConDatosCliente(idNodo, remitente, respuesta);
    }

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

// Reemplaza {nombre}/{saldo} en la plantilla consultando el backend Java del
// nodo (mismo endpoint que usa el bot de Telegram: GET /clientes?celular=).
// Si falla o el nodo no tiene endpoint configurado, deja la plantilla como
// vino — mejor mandar el placeholder sin resolver que dejar al cliente sin
// respuesta.
async function enriquecerConDatosCliente(idNodo: number, celular: string, respuesta: string): Promise<string> {
  try {
    const [nodoRows]: any = await db.query('SELECT endpoint, token FROM nodo WHERE id = ?', [idNodo]);
    if (!nodoRows || nodoRows.length === 0 || !nodoRows[0].endpoint) return respuesta;
    const nodo = nodoRows[0];

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (nodo.token) headers['Authorization'] = `Bearer ${nodo.token}`;

    const apiRes = await fetch(
      `${nodo.endpoint.replace(/\/$/, '')}/clientes?celular=${encodeURIComponent(celular)}`,
      { headers }
    );
    if (!apiRes.ok) return respuesta;

    const clienteData = await apiRes.json();
    const cliente = clienteData?.cliente || clienteData;
    if (cliente?.nombre) respuesta = respuesta.replace(/{nombre}/g, cliente.nombre);
    if (clienteData?.saldo !== undefined) {
      respuesta = respuesta.replace(/{saldo}/g, `$${Number(clienteData.saldo).toLocaleString('es-AR')}`);
    }
    return respuesta;
  } catch (error) {
    console.warn('[BOT] No se pudo enriquecer con datos del cliente:', error);
    return respuesta;
  }
}

async function sendWhatsAppTextReply(phoneNumberId: string, to: string, texto: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatearDestinoWhatsAppAR(to),
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

// Llamadas por WhatsApp (Calling API vía SIP). Meta manda dos eventos por
// llamada -- "call_created" al iniciarse y "terminate" al cortarse -- y
// puede reintentar la entrega del webhook hasta 7 días si no responde 200,
// por eso todo esto es idempotente por wa_call_id (ON DUPLICATE KEY / update
// dirigido) en vez de un INSERT liso que duplicaría la fila en cada retry.
function unixSegundosADate(ts: unknown): Date | null {
  const n = Number(ts);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : null;
}

async function handleCallEvent(call: any, phoneNumberId: string) {
  try {
    const waCallId: string | undefined = call.id;
    if (!waCallId) return;

    const cuenta = await getCuentaByPhoneNumberId(phoneNumberId);
    if (!cuenta) {
      console.warn(`[WHATSAPP-CALL] No se encontró crm_cuentas activa para phone_number_id ${phoneNumberId}`);
      return;
    }
    const { id_nodo: idNodo } = cuenta;

    // BUSINESS_INITIATED = la iniciamos nosotros (OUTBOUND); cualquier otro
    // valor (USER_INITIATED) es el cliente llamando (INBOUND).
    const direction: 'INBOUND' | 'OUTBOUND' = call.direction === 'BUSINESS_INITIATED' ? 'OUTBOUND' : 'INBOUND';
    const phoneNumberCliente: string = direction === 'OUTBOUND' ? call.to : call.from;

    const [convRows]: any = await db.query(
      `SELECT id FROM whatsapp_conversations WHERE id_nodo = ? AND phone_number = ? LIMIT 1`,
      [idNodo, phoneNumberCliente]
    );
    const conversationId = convRows?.[0]?.id || null;

    if (call.event === 'call_created') {
      await db.query(
        `INSERT INTO crm_llamadas
         (id_nodo, conversation_id, wa_call_id, phone_number, direction, start_time, raw_created_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE raw_created_payload = VALUES(raw_created_payload)`,
        [idNodo, conversationId, waCallId, phoneNumberCliente, direction, unixSegundosADate(call.timestamp), JSON.stringify(call)]
      );
      console.log(`📞 Llamada creada ${waCallId} (${direction}) nodo ${idNodo}`);
      return;
    }

    if (call.event === 'terminate') {
      const [result]: any = await db.query(
        `UPDATE crm_llamadas SET
           status = ?,
           start_time = COALESCE(?, start_time),
           end_time = ?,
           duration_seconds = ?,
           raw_terminate_payload = ?
         WHERE wa_call_id = ?`,
        [
          call.status || null,
          unixSegundosADate(call.start_time),
          unixSegundosADate(call.end_time),
          typeof call.duration === 'number' ? call.duration : null,
          JSON.stringify(call),
          waCallId,
        ]
      );

      // Si nunca llegó (o se perdió) el call_created, dejamos igual el
      // registro final -- mejor tener el resultado sin el arranque que no
      // tener nada.
      if (!result.affectedRows) {
        await db.query(
          `INSERT INTO crm_llamadas
           (id_nodo, conversation_id, wa_call_id, phone_number, direction, status, start_time, end_time, duration_seconds, raw_terminate_payload)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status)`,
          [
            idNodo, conversationId, waCallId, phoneNumberCliente, direction,
            call.status || null, unixSegundosADate(call.start_time), unixSegundosADate(call.end_time),
            typeof call.duration === 'number' ? call.duration : null, JSON.stringify(call),
          ]
        );
      }
      console.log(`📞 Llamada terminada ${waCallId}: ${call.status || 'sin status'}`);
    }
  } catch (error) {
    console.error('❌ Error handling call event:', error);
  }
}
