import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { waba_id, access_token } = body;

    if (!waba_id || !access_token) {
      return NextResponse.json(
        { success: false, error: 'Se requieren el WABA ID y el Access Token' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const idNodoStr = cookieStore.get("hyperisp_active_node_id")?.value;
    const idNodo = idNodoStr ? parseInt(idNodoStr, 10) : 1;

    // Consultar los números asociados a este WABA desde Meta Graph API
    const metaUrl = `https://graph.facebook.com/v20.0/${waba_id}/phone_numbers?access_token=${access_token}`;
    const resMeta = await fetch(metaUrl);
    const dataMeta = await resMeta.json();

    if (!resMeta.ok || !dataMeta.data) {
      console.error("Error consultando Meta Graph API:", dataMeta);
      return NextResponse.json(
        { success: false, error: dataMeta.error?.message || 'Error al conectar con Meta Graph API' },
        { status: 400 }
      );
    }

    const phoneNumbers = dataMeta.data; // Lista de números devueltos por Meta
    let syncedCount = 0;

    for (const phone of phoneNumbers) {
      // phone.id es el Phone Number ID
      // phone.display_phone_number es el número formateado (ej. "+54 9 11 ...")
      const phoneNumberId = phone.id;
      
      await db.query(
        `INSERT INTO crm_cuentas (id_nodo, canal, identificador, token, activo)
         VALUES (?, 'whatsapp', ?, ?, 1)
         ON DUPLICATE KEY UPDATE token = ?, activo = 1`,
        [idNodo, phoneNumberId, access_token, access_token]
      );
      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Se sincronizaron ${syncedCount} números desde Meta exitosamente`,
      data: phoneNumbers
    });

  } catch (error: any) {
    console.error('Error en sync con Meta:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
