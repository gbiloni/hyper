import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { canal, cuenta_emisora, destinatario, texto, adjuntos } = body;

    if (!canal || !cuenta_emisora || !destinatario || (!texto && !adjuntos)) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
    }

    // 1. Buscar la cuenta emisora en la base de datos para obtener el Token
    const sqlCuenta = `
      SELECT token 
      FROM crm_cuentas 
      WHERE canal = ? AND identificador = ? AND activo = 1 
      LIMIT 1
    `;
    const [rows]: any = await db.query(sqlCuenta, [canal, cuenta_emisora]);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Cuenta emisora no encontrada o inactiva en el CRM' }, { status: 404 });
    }

    const token = rows[0].token;
    const wappId = `OUT-${Date.now()}`;

    // 2. Despachar a la API correspondiente según el canal
    let envioExitoso = false;
    let externalId = wappId; // ID que devuelve Meta/Telegram

    if (canal === 'whatsapp') {
      envioExitoso = await sendWhatsAppMessage(cuenta_emisora, destinatario, texto, token);
    } else if (canal === 'telegram') {
      envioExitoso = await sendTelegramMessage(destinatario, texto, token);
    } else {
      // Messenger / Instagram
      return NextResponse.json({ error: 'Canal saliente no implementado' }, { status: 501 });
    }

    // 3. Guardar el log en la base de datos (wapp_mensajes)
    if (envioExitoso) {
      const sqlLog = `
        INSERT INTO wapp_mensajes 
        (whatsapp_id, remitente_nro, cuerpo_mensaje, direccion, canal, leido, fecha_recepcion) 
        VALUES (?, ?, ?, 'SALIENTE', ?, 1, NOW())
      `;
      // Ojo: en mensajes salientes, el "remitente_nro" en HyperISP suele ser el destinatario final (para que agrupe en el chat)
      await db.query(sqlLog, [externalId, destinatario, texto, canal]);
      
      return NextResponse.json({ success: true, messageId: externalId });
    } else {
      return NextResponse.json({ error: 'Fallo al enviar el mensaje a la API externa' }, { status: 502 });
    }

  } catch (error: any) {
    console.error('[OUTBOUND-API] Error enviando mensaje:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ==============================================================
// Lógica de Despacho a APIs Externas
// ==============================================================

async function sendWhatsAppMessage(phoneId: string, to: string, text: string, token: string): Promise<boolean> {
  try {
    // La API de WhatsApp usa el Phone Number ID en la URL, que en el CRM guardamos como "identificador" (cuenta_emisora)
    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: { preview_url: false, body: text }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok && data.messages) {
      console.log(`[OUTBOUND-WA] Mensaje enviado a ${to}`);
      return true;
    } else {
      console.error(`[OUTBOUND-WA] Error de Meta:`, data);
      return false;
    }
  } catch (err) {
    console.error(`[OUTBOUND-WA] Excepción:`, err);
    return false;
  }
}

async function sendTelegramMessage(chatId: string, text: string, token: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML"
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok && data.ok) {
      console.log(`[OUTBOUND-TG] Mensaje enviado al chat ${chatId}`);
      return true;
    } else {
      console.error(`[OUTBOUND-TG] Error de Telegram:`, data);
      return false;
    }
  } catch (err) {
    console.error(`[OUTBOUND-TG] Excepción:`, err);
    return false;
  }
}
