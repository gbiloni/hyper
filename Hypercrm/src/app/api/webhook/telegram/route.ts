import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    console.log("====== [WEBHOOK TELEGRAM NATIVO] ======");
    console.log(JSON.stringify(payload, null, 2));

    // Responder rápido a Telegram para que no reenvíe
    procesarPayloadAsincrono(payload).catch(err => 
      console.error("[TELEGRAM-WEBHOOK] Error procesando payload asíncrono:", err)
    );

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error('Error procesando Telegram POST webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function procesarPayloadAsincrono(payload: any) {
  if (!payload || !payload.message || !payload.message.text) return;
  
  const chatId = String(payload.message.chat.id);
  const textOriginal = payload.message.text;
  const textLower = textOriginal.toLowerCase().trim();
  const messageId = payload.message.message_id;
  const wappId = `TG-${messageId}`;

  // 1. Guardar mensaje entrante
  try {
    await db.query(
      `INSERT INTO wapp_mensajes (whatsapp_id, remitente_nro, cuerpo_mensaje, direccion, canal, leido, fecha_recepcion)
       VALUES (?, ?, ?, 'ENTRANTE', 'telegram', 0, NOW())`,
      [wappId, chatId, textOriginal]
    );
    console.log(`[TELEGRAM-WEBHOOK] Guardado -> De: ${chatId}`);
  } catch (dbError) {
    console.error('[TELEGRAM-WEBHOOK] Error INSERT wapp_mensajes:', dbError);
  }

  // 2. Identificar nodo y token del bot que recibió el mensaje
  let idNodo: number | null = null;
  let botToken: string | null = null;

  try {
    const [cuentaRows]: any = await db.query(
      `SELECT c.id_nodo, c.token FROM crm_cuentas c 
       WHERE c.canal = 'telegram' AND c.activo = 1
       ORDER BY c.id ASC LIMIT 1`
    );
    if (cuentaRows?.length > 0) {
      idNodo = cuentaRows[0].id_nodo;
      botToken = cuentaRows[0].token;
    }
  } catch (e) {
    console.error('[TELEGRAM-WEBHOOK] Error buscando cuenta:', e);
  }

  if (!idNodo || !botToken) {
    console.warn('[TELEGRAM-WEBHOOK] No se encontró cuenta Telegram activa para responder.');
    return;
  }

  // 3. Evaluar reglas del bot (crm_bot_config)
  try {
    const [reglas]: any = await db.query(
      `SELECT * FROM crm_bot_config 
       WHERE id_nodo = ? AND activo = 1 AND (canal = 'telegram' OR canal = 'all')
       ORDER BY orden ASC, id ASC`,
      [idNodo]
    );

    if (!reglas || reglas.length === 0) return;

    let respuesta: string | null = null;
    let defaultRespuesta: string | null = null;

    for (const regla of reglas) {
      if (regla.tipo === 'default') {
        defaultRespuesta = regla.respuesta;
        continue;
      }
      // Coincidencia por keyword (substring)
      if (textLower.includes(regla.pregunta.toLowerCase())) {
        respuesta = regla.respuesta;
        break;
      }
    }

    if (!respuesta) respuesta = defaultRespuesta;
    if (!respuesta) return; // Sin coincidencia y sin default → encola para agente humano

    // 4. Enriquecer respuesta con datos del cliente si la plantilla lo requiere
    if (respuesta.includes('{nombre}') || respuesta.includes('{saldo}')) {
      try {
        const [nodoRows]: any = await db.query('SELECT endpoint, token FROM nodo WHERE id = ?', [idNodo]);
        if (nodoRows?.length > 0) {
          const nodo = nodoRows[0];
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (nodo.token) headers['Authorization'] = `Bearer ${nodo.token}`;
          
          const apiRes = await fetch(`${nodo.endpoint}/clientes?celular=${chatId}`, { headers });
          if (apiRes.ok) {
            const clienteData = await apiRes.json();
            const cliente = clienteData?.cliente || clienteData;
            if (cliente?.nombre) respuesta = respuesta.replace(/{nombre}/g, cliente.nombre);
            if (clienteData?.saldo !== undefined) respuesta = respuesta.replace(/{saldo}/g, `$${Number(clienteData.saldo).toLocaleString('es-AR')}`);
          }
        }
      } catch (e) {
        console.warn('[TELEGRAM-WEBHOOK] No se pudo enriquecer con datos del cliente:', e);
      }
    }

    // 5. Enviar respuesta automática
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const tgRes = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: respuesta, parse_mode: 'HTML' })
    });

    if (tgRes.ok) {
      // 6. Guardar respuesta del bot en BD
      await db.query(
        `INSERT INTO wapp_mensajes (whatsapp_id, remitente_nro, cuerpo_mensaje, direccion, canal, leido, fecha_recepcion)
         VALUES (?, ?, ?, 'SALIENTE', 'telegram', 1, NOW())`,
        [`TG-BOT-${Date.now()}`, chatId, respuesta]
      );
      console.log(`[TELEGRAM-BOT] Respuesta automática enviada a ${chatId}`);
    } else {
      console.error('[TELEGRAM-BOT] Error enviando respuesta:', await tgRes.text());
    }

  } catch (e) {
    console.error('[TELEGRAM-WEBHOOK] Error evaluando bot:', e);
  }
}
