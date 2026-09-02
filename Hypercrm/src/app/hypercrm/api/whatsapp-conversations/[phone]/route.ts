import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(
  req: Request,
  { params }: { params: { phone: string } }
) {
  try {
    const cookieStore = await cookies();
    const idNodo = parseInt(cookieStore.get("hyperisp_active_node_id")?.value || "1", 10);
    const phone = decodeURIComponent(params.phone);

    const [messages]: any = await db.query(
      `SELECT m.id, m.direction, m.message_type, m.content, m.status, m.created_at
       FROM whatsapp_messages m
       WHERE m.id_nodo = ? AND m.phone_number = ?
       ORDER BY m.created_at ASC
       LIMIT 500`,
      [idNodo, phone]
    );

    return NextResponse.json({ success: true, data: messages });
  } catch (error: any) {
    console.error('Error getting conversation history:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
