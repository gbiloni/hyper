import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const { name, language, category, header_text, body_text, footer_text, buttons } = body;

    const cookieStore = await cookies();
    const idNodo = parseInt(cookieStore.get("hyperisp_active_node_id")?.value || "1", 10);

    const [result]: any = await db.query(
      `UPDATE whatsapp_templates
       SET name = ?, language = ?, category = ?, header_text = ?, body_text = ?, footer_text = ?, buttons = ?
       WHERE id = ? AND id_nodo = ?`,
      [name, language || 'es', category, header_text || null, body_text, footer_text || null, JSON.stringify(buttons || []), id, idNodo]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Template updated successfully' });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const cookieStore = await cookies();
    const idNodo = parseInt(cookieStore.get("hyperisp_active_node_id")?.value || "1", 10);

    const [result]: any = await db.query(
      `DELETE FROM whatsapp_templates WHERE id = ? AND id_nodo = ?`,
      [id, idNodo]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
