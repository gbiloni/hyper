import { NextResponse } from 'next/server';
import { GRAPH_VERSION } from '@/lib/metaGraph';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone_number, message_type, content, template_id, variables, mark_escalated, header } = body;

    if (!phone_number || !message_type) {
      return NextResponse.json(
        { success: false, error: 'phone_number and message_type are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const idNodo = parseInt(cookieStore.get("hyperisp_active_node_id")?.value || "1", 10);

    // Get configured WhatsApp number
    const [phoneConfig]: any = await db.query(
      `SELECT identificador as phone_number_id, token as access_token FROM crm_cuentas
       WHERE id_nodo = ? AND canal = 'whatsapp' AND activo = 1
       LIMIT 1`,
      [idNodo]
    );

    if (!phoneConfig || phoneConfig.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No WhatsApp number configured' },
        { status: 400 }
      );
    }

    const phoneNumberId = phoneConfig[0].phone_number_id;
    const accessToken = phoneConfig[0].access_token;

    // Normalize phone number
    const normalizedPhone = phone_number.replace(/\D/g, '');
    if (!normalizedPhone.startsWith('54')) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    let payload: any = {
      messaging_product: 'whatsapp',
      to: normalizedPhone,
    };

    // Build payload based on type
    if (message_type === 'text') {
      if (!content) {
        return NextResponse.json(
          { success: false, error: 'content is required for text messages' },
          { status: 400 }
        );
      }
      payload.type = 'text';
      payload.text = { body: content };
    } else if (message_type === 'template') {
      if (!template_id) {
        return NextResponse.json(
          { success: false, error: 'template_id is required for template messages' },
          { status: 400 }
        );
      }

      const [templates]: any = await db.query(
        `SELECT name FROM whatsapp_templates WHERE id = ? AND id_nodo = ?`,
        [template_id, idNodo]
      );

      if (!templates || templates.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }

      // El header es opcional: solo hace falta cuando la plantilla aprobada
      // en Meta tiene un componente de header con variable (imagen o texto).
      // Sin esto, mandar una plantilla con header de imagen fallaba porque
      // el payload solo llevaba el componente "body".
      const components: any[] = [];
      if (header) {
        if (header.type === 'image' && (header.image_id || header.image_link)) {
          components.push({
            type: 'header',
            parameters: [{
              type: 'image',
              image: header.image_id ? { id: header.image_id } : { link: header.image_link },
            }],
          });
        } else if (header.type === 'text' && header.text) {
          components.push({ type: 'header', parameters: [{ type: 'text', text: String(header.text) }] });
        } else {
          return NextResponse.json(
            { success: false, error: 'header debe ser {type:"image", image_id|image_link} o {type:"text", text}' },
            { status: 400 }
          );
        }
      }
      components.push({
        type: 'body',
        parameters: (variables || []).map((v: any) => ({ type: 'text', text: String(v) }))
      });

      payload.type = 'template';
      payload.template = {
        name: templates[0].name,
        language: { code: 'es' },
        components,
      };
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported message type' },
        { status: 400 }
      );
    }

    // Send to Meta API
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Meta API error:', result);
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Error sending message' },
        { status: 400 }
      );
    }

    // Save to history
    const messageId = result.messages?.[0]?.id;
    const [conversations]: any = await db.query(
      `SELECT id FROM whatsapp_conversations
       WHERE id_nodo = ? AND phone_number = ?
       LIMIT 1`,
      [idNodo, phone_number]
    );

    const conversationId = conversations?.[0]?.id || null;

    await db.query(
      `INSERT INTO whatsapp_messages
       (id_nodo, conversation_id, phone_number, direction, message_type, content, template_id, waba_message_id, status)
       VALUES (?, ?, ?, 'OUTBOUND', ?, ?, ?, ?, 'SENT')`,
      [idNodo, conversationId, phone_number, message_type, content || '', template_id || null, messageId]
    );

    // Escalado a agente humano: opt-in explícito (lo pide la bandeja de
    // soporte cuando un operador contesta manual). No se activa solo, para
    // no silenciar el bot si en el futuro este endpoint se usa también para
    // envíos automáticos (ej. campañas de plantillas).
    if (conversationId && mark_escalated) {
      await db.query(
        `UPDATE whatsapp_conversations SET last_message_at = NOW(), escalated_to_agent = 1 WHERE id = ?`,
        [conversationId]
      );
    } else if (conversationId) {
      await db.query(`UPDATE whatsapp_conversations SET last_message_at = NOW() WHERE id = ?`, [conversationId]);
    }

    console.log(`✅ Message sent to ${phone_number}`);

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: { message_id: messageId }
    });

  } catch (error: any) {
    console.error('❌ Error sending message:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
