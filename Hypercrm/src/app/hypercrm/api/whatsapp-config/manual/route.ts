import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone_number_id, token } = body;

    if (!phone_number_id) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el Phone Number ID o número de teléfono' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const idNodoStr = cookieStore.get("hyperisp_active_node_id")?.value;
    const idNodo = idNodoStr ? parseInt(idNodoStr, 10) : 1;

    // Guardar o actualizar en crm_cuentas
    await db.query(
      `INSERT INTO crm_cuentas (id_nodo, canal, identificador, token, activo)
       VALUES (?, 'whatsapp', ?, ?, 1)
       ON DUPLICATE KEY UPDATE token = VALUES(token), activo = 1`,
      [idNodo, phone_number_id, token || '']
    );

    return NextResponse.json({
      success: true,
      message: 'Número guardado exitosamente en crm_cuentas'
    });

  } catch (error: any) {
    console.error('Error guardando número manual:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
