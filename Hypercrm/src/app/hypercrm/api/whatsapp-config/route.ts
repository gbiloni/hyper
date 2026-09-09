import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const idNodoStr = cookieStore.get("hyperisp_active_node_id")?.value;
    
    const idNodo = idNodoStr ? parseInt(idNodoStr, 10) : 1;

    // OJO: nunca seleccionar `token` acá — esta respuesta va directo al
    // navegador, y antes se mandaba el access_token disfrazado de waba_id.
    const [rows]: any = await db.query(
      `SELECT id, identificador as phone_number_id, identificador as display_name, waba_id, activo
       FROM crm_cuentas
       WHERE id_nodo = ? AND canal = 'whatsapp'`,
      [idNodo]
    );

    const formattedRows = (rows || []).map((r: any) => ({
      id: r.id,
      area: r.display_name || "Soporte",
      numero: r.phone_number_id,
      waba_id: r.waba_id,
      phone_number_id: r.phone_number_id,
      estado: r.activo ? "ACTIVO" : "ERROR",
      coexistence: 0,
      created_at: new Date().toISOString()
    }));

    return NextResponse.json(formattedRows);

  } catch (error: any) {
    console.error('Error listando whatsapp-config local:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
