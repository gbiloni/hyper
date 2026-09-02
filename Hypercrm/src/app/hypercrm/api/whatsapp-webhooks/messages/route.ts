import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Webhook verification from Meta
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN || 'hyperisp_meta_2026';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Webhook verified by Meta');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('❌ Webhook verification failed');
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}

// Receive messages from Meta
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Log webhook event
    console.log('📨 Webhook received:', JSON.stringify(body, null, 2));

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ received: true });
    }

    for (const entry of body.entry) {
      const wabaId = entry.id;

      for (const change of entry.changes) {
        const value = change.value;

        // Process incoming messages
        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            await handleIncomingMessage(message, wabaId);
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

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json({ received: true }); // Return OK to prevent retries
  }
}

async function handleIncomingMessage(message: any, wabaId: string) {
  try {
    const phoneNumber = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp;
    const type = message.type; // text, interactive, etc.

    let messageContent = '';
    if (type === 'text') {
      messageContent = message.text.body;
    } else if (type === 'interactive') {
      messageContent = message.interactive?.button_reply?.title || 'Interactive message';
    }

    // Default to node 1 (TODO: map WABA ID to node)
    const idNodo = 1;

    // Get or create conversation
    const [conversations]: any = await db.query(
      `SELECT id FROM whatsapp_conversations
       WHERE id_nodo = ? AND phone_number = ?
       LIMIT 1`,
      [idNodo, phoneNumber]
    );

    let conversationId: number;
    if (conversations.length > 0) {
      conversationId = conversations[0].id;
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

    console.log(`✅ Message saved from ${phoneNumber} in conversation ${conversationId}`);

  } catch (error) {
    console.error('❌ Error handling incoming message:', error);
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
