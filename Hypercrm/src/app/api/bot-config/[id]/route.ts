import { NextResponse } from 'next/server';
import db from '@/lib/db';

// PUT /api/bot-config/[id] — Actualiza una regla
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { pregunta, respuesta, canal, tipo, orden, activo } = await req.json();
    await db.query(
      'UPDATE crm_bot_config SET pregunta=?, respuesta=?, canal=?, tipo=?, orden=?, activo=? WHERE id=?',
      [pregunta, respuesta, canal, tipo, orden, activo ? 1 : 0, params.id]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/bot-config/[id] — Elimina una regla
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await db.query('DELETE FROM crm_bot_config WHERE id=?', [params.id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
