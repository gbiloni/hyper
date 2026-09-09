import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let { waba_id, access_token } = body || {};

    const cookieStore = await cookies();
    const idNodoStr = cookieStore.get("hyperisp_active_node_id")?.value;
    const idNodo = idNodoStr ? parseInt(idNodoStr, 10) : 1;

    // Modo automático: si no mandaron waba_id/access_token a mano, usamos los
    // de una cuenta que ya se conectó antes (Alta Manual o Asistente de Meta),
    // así nadie tiene que volver a pegar un token cada vez que se quiere
    // refrescar la lista de números.
    let autoMode = false;
    if (!waba_id || !access_token) {
      const [existing]: any = await db.query(
        `SELECT waba_id, token FROM crm_cuentas
         WHERE id_nodo = ? AND canal = 'whatsapp' AND activo = 1
           AND waba_id IS NOT NULL AND waba_id <> ''
           AND token IS NOT NULL AND token <> ''
         LIMIT 1`,
        [idNodo]
      );
      if (!existing || existing.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No hay ninguna cuenta conectada todavía con WABA ID guardado. Conectá un número primero (Alta Manual o Asistente de Meta), o pegá el WABA ID y token acá manualmente.',
          },
          { status: 400 }
        );
      }
      waba_id = existing[0].waba_id;
      access_token = existing[0].token;
      autoMode = true;
    }

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
        `INSERT INTO crm_cuentas (id_nodo, canal, identificador, waba_id, token, activo)
         VALUES (?, 'whatsapp', ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE waba_id = VALUES(waba_id), token = VALUES(token), activo = 1`,
        [idNodo, phoneNumberId, waba_id, access_token]
      );
      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: autoMode
        ? `Sincronización automática: ${syncedCount} número(s) actualizados desde Meta.`
        : `Se sincronizaron ${syncedCount} números desde Meta exitosamente`,
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
