import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { vincularCiudades, resolverIdNodos } from '../ciudades';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone_number_id, token, id_nodos } = body;

    if (!phone_number_id) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el Phone Number ID o número de teléfono' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const idNodoStr = cookieStore.get("hyperisp_active_node_id")?.value;
    const nodos = resolverIdNodos(id_nodos, idNodoStr);

    // Guardar o actualizar en crm_cuentas. La ciudad "principal" (columna
    // id_nodo, todavía usada por el webhook para resolver la conversación)
    // es la de menor id entre las elegidas -- ver vincularCiudades().
    await db.query(
      `INSERT INTO crm_cuentas (id_nodo, canal, identificador, token, activo)
       VALUES (?, 'whatsapp', ?, ?, 1)
       ON DUPLICATE KEY UPDATE token = VALUES(token), activo = 1, id_nodo = VALUES(id_nodo)`,
      [Math.min(...nodos), phone_number_id, token || '']
    );
    await vincularCiudades('whatsapp', phone_number_id, nodos);

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
