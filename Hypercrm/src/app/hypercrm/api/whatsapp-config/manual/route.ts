import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { resolverIdNodo, ERROR_NODO } from '@/lib/cuentaNodo';

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
    const idNodo = resolverIdNodo(body, cookieStore.get("hyperisp_active_node_id")?.value);
    if (!idNodo) {
      return NextResponse.json({ success: false, error: ERROR_NODO }, { status: 400 });
    }

    // Guardar o actualizar en crm_cuentas. Si el número ya existía, pasa al
    // nodo elegido: es un alta explícita de ese número.
    await db.query(
      `INSERT INTO crm_cuentas (id_nodo, canal, identificador, token, activo)
       VALUES (?, 'whatsapp', ?, ?, 1)
       ON DUPLICATE KEY UPDATE token = VALUES(token), activo = 1, id_nodo = VALUES(id_nodo)`,
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
