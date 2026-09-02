import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';

const DEFAULT_VERIFY_TOKEN = 'hyperisp_meta_2026';

// GET para el handshake de verificación inicial de Meta
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[META-WEBHOOK] Webhook verificado ✓');
      return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    console.warn('[META-WEBHOOK] Token incorrecto.');
    return new NextResponse('Forbidden: Token mismatch', { status: 403 });
  }
  return new NextResponse('Bad Request', { status: 400 });
}

// POST para recibir eventos (mensajes entrantes) de Meta
export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-hub-signature-256') || '';
    const rawBody = await request.text();

    const appSecret = process.env.META_APP_SECRET;
    if (appSecret && signature) {
      const expectedSig = signature.substring(7);
      const hash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
      if (hash !== expectedSig) {
        console.warn('[META-WEBHOOK] Firma HMAC inválida.');
        return NextResponse.json({ error: 'invalid_signature' }, { status: 403 });
      }
    }

    const payload = JSON.parse(rawBody);
    console.log("====== [WEBHOOK META NATIVO] ======");
    console.log(JSON.stringify(payload, null, 2));
    
    // Identificar canal
    let canal = "desconocido";
    if (payload.object === 'whatsapp_business_account') canal = 'whatsapp';
    else if (payload.object === 'page') canal = 'messenger';
    else if (payload.object === 'instagram') canal = 'instagram';

    // 1. Responder rápido a Meta (fire and forget pattern con Promises)
    procesarPayloadAsincrono(payload, canal, rawBody).catch(err => 
      console.error("[META-WEBHOOK] Error procesando payload asíncrono:", err)
    );

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error('Error procesando Meta POST webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Procesar y guardar en BD local asincrónicamente, luego forwardear al Nodo
async function procesarPayloadAsincrono(payload: any, canal: string, rawBody: string) {
  if (!payload.entry) return;

  for (const entry of payload.entry) {
    if (canal === 'whatsapp' && entry.changes) {
      for (const change of entry.changes) {
        if (change.value && change.value.messages) {
          // OJO: display_phone_number (ej. "+1 555...") NO es lo mismo que
          // phone_number_id (el identificador numérico que guardamos en
          // crm_cuentas.identificador). Hay que usar phone_number_id para
          // que el lookup de la cuenta/nodo funcione.
          const phoneNumberId = change.value.metadata?.phone_number_id || '';

          for (const msg of change.value.messages) {
            const wappId = `WA-${msg.id}`;
            const remitente = msg.from;
            let texto = "";
            if (msg.type === "text") texto = msg.text?.body || "";
            else if (msg.type === "image") texto = "[Imagen recibida]";
            else texto = `[Adjunto: ${msg.type}]`;

            // 1. Guardar copia de seguridad en el CRM central
            await insertarMensaje(wappId, remitente, texto, canal);

            // 2. Evaluar el bot de intents/keywords (crm_bot_config) y
            //    contestar automáticamente si hay una regla activa.
            await evaluarBot(phoneNumberId, remitente, texto, canal);

            // 3. Forwardear al Nodo correspondiente
            await forwardToNodo(phoneNumberId, canal, rawBody);
          }
        }
      }
    } else if ((canal === 'messenger' || canal === 'instagram') && entry.messaging) {
      for (const event of entry.messaging) {
        if (event.message) {
          const wappId = `META-${event.message.mid}`;
          const remitente = event.sender?.id;
          const destinatario = event.recipient?.id || '';
          const texto = event.message.text || `[Adjunto recibido]`;
          
          await insertarMensaje(wappId, remitente, texto, canal);
          await forwardToNodo(destinatario, canal, rawBody);
        }
      }
    }
  }
}

// Motor de bot: evalúa las reglas de crm_bot_config para el nodo dueño del
// número que recibió el mensaje, y si hay una keyword activa que matchea,
// contesta automáticamente y lo registra como SALIENTE_BOT.
async function evaluarBot(phoneNumberId: string, remitente: string, texto: string, canal: string) {
  if (!phoneNumberId || !texto) return;
  try {
    const sqlCuenta = `
      SELECT id_nodo, token FROM crm_cuentas
      WHERE identificador = ? AND canal = ? AND activo = 1
      LIMIT 1
    `;
    const [cuentaRows]: any = await db.query(sqlCuenta, [phoneNumberId, canal]);
    if (!cuentaRows || cuentaRows.length === 0) {
      console.warn(`[BOT] No se encontró crm_cuentas activa para phone_number_id ${phoneNumberId}`);
      return;
    }
    const { id_nodo: idNodo, token } = cuentaRows[0];

    const sqlRegla = `
      SELECT respuesta FROM crm_bot_config
      WHERE id_nodo = ? AND (canal = ? OR canal = 'all') AND activo = 1
        AND LOWER(?) LIKE CONCAT('%', LOWER(pregunta), '%')
      ORDER BY orden ASC
      LIMIT 1
    `;
    const [reglaRows]: any = await db.query(sqlRegla, [idNodo, canal, texto]);
    if (!reglaRows || reglaRows.length === 0) return; // Sin match: queda para el agente humano.

    const respuesta: string = reglaRows[0].respuesta;

    const enviado = await sendWhatsAppTextReply(phoneNumberId, remitente, respuesta, token);
    if (enviado) {
      await insertarMensaje(`BOT-${Date.now()}`, remitente, respuesta, canal, 'SALIENTE_BOT');
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

async function forwardToNodo(identificador: string, canal: string, rawBody: string) {
  if (!identificador) return;
  try {
    // Buscar a qué nodo pertenece este identificador
    const sql = `
      SELECT n.endpoint, n.token 
      FROM crm_cuentas c
      JOIN nodo n ON c.id_nodo = n.id
      WHERE c.identificador = ? AND c.canal = ? AND c.activo = 1
      LIMIT 1
    `;
    const [rows]: any = await db.query(sql, [identificador, canal]);
    
    if (rows && rows.length > 0) {
      const nodo = rows[0];
      if (nodo.endpoint) {
        console.log(`[META-WEBHOOK] Forwardeando mensaje de ${identificador} al Nodo: ${nodo.endpoint}`);
        
        // Asumimos que el endpoint termina en /api3, le concatenamos la ruta del webhook
        const targetUrl = `${nodo.endpoint.replace(/\/$/, '')}/chats/webhook/meta`;
        
        await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Pasamos un header interno si el nodo de destino lo requiere, o replicamos la firma
            'X-Hub-Signature-256': crypto.createHmac('sha256', process.env.META_APP_SECRET || '').update(rawBody).digest('hex')
          },
          body: rawBody
        });
      }
    } else {
      console.warn(`[META-WEBHOOK] No se encontró un nodo activo para el identificador: ${identificador}`);
    }
  } catch (error) {
    console.error('[META-WEBHOOK] Error forwardeando al nodo:', error);
  }
}

async function insertarMensaje(
  wappId: string,
  remitente: string,
  cuerpo: string,
  canal: string,
  direccion: 'ENTRANTE' | 'SALIENTE_BOT' = 'ENTRANTE'
) {
  try {
    const sql = `
      INSERT INTO wapp_mensajes
      (whatsapp_id, remitente_nro, cuerpo_mensaje, direccion, canal, leido, fecha_recepcion)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    // Los mensajes salientes (del bot) se marcan como leídos; los entrantes, no.
    const leido = direccion === 'ENTRANTE' ? 0 : 1;
    await db.query(sql, [wappId, remitente, cuerpo, direccion, canal, leido]);
    console.log(`[META-WEBHOOK] Guardado (${direccion}) -> De/Para: ${remitente} (${canal})`);
  } catch (dbError) {
    console.error('[META-WEBHOOK] Error en INSERT wapp_mensajes:', dbError);
  }
}
