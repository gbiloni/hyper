import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const idNodo = parseInt(cookieStore.get("hyperisp_active_node_id")?.value || "1", 10);

    const [templates]: any = await db.query(
      `SELECT id, name, language, category, body_text, meta_status, created_at
       FROM whatsapp_templates
       WHERE id_nodo = ?
       ORDER BY created_at DESC`,
      [idNodo]
    );

    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('Error getting templates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, language, category, header_text, body_text, footer_text, buttons } = body;

    if (!name || !body_text || !category) {
      return NextResponse.json(
        { success: false, error: 'Name, body_text, and category are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const idNodo = parseInt(cookieStore.get("hyperisp_active_node_id")?.value || "1", 10);

    const [result]: any = await db.query(
      `INSERT INTO whatsapp_templates
       (id_nodo, name, language, category, header_text, body_text, footer_text, buttons, meta_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
      [idNodo, name, language || 'es', category, header_text || null, body_text, footer_text || null, JSON.stringify(buttons || [])]
    );

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      data: { id: result.insertId }
    });
  } catch (error: any) {
    console.error('Error creating template:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Template with this name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
