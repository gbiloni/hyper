import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const cookieStore = await cookies();
    const idNodo = parseInt(cookieStore.get("hyperisp_active_node_id")?.value || "1", 10);

    let query = `
      SELECT c.id, c.phone_number, c.user_name, c.escalated_to_agent,
             c.last_message_at, COUNT(m.id) as total_messages
      FROM whatsapp_conversations c
      LEFT JOIN whatsapp_messages m ON c.id = m.conversation_id
      WHERE c.id_nodo = ?
    `;
    const params: any[] = [idNodo];

    if (phone) {
      query += ` AND c.phone_number LIKE ?`;
      params.push(`%${phone}%`);
    }

    query += ` GROUP BY c.id ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [conversations]: any = await db.query(query, params);

    return NextResponse.json({
      success: true,
      data: conversations,
      pagination: { limit, offset }
    });
  } catch (error: any) {
    console.error('Error getting conversations:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
