import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const idNodoStr = cookieStore.get("hyperisp_active_node_id")?.value;
    const idNodo = idNodoStr ? parseInt(idNodoStr, 10) : 1;

    await db.query(
      `DELETE FROM crm_cuentas WHERE id = ? AND id_nodo = ? AND canal = 'whatsapp'`,
      [id, idNodo]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error eliminando whatsapp-config local:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
