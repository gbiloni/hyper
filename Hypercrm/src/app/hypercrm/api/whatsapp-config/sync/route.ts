import { NextResponse } from 'next/server';
import { GRAPH_VERSION } from '@/lib/metaGraph';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { resolverIdNodo, ERROR_NODO } from '@/lib/cuentaNodo';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let { waba_id, access_token } = body || {};

    const cookieStore = await cookies();
    const idNodo = resolverIdNodo(body, cookieStore.get("hyperisp_active_node_id")?.value);
    if (!idNodo) {
      return NextResponse.json({ success: false, error: ERROR_NODO }, { status: 400 });
    }

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
    const metaUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${waba_id}/phone_numbers?access_token=${access_token}`;
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
    let nuevos = 0;
    let existentes = 0;

    for (const phone of phoneNumbers) {
      // phone.id es el Phone Number ID
      // phone.display_phone_number es el número formateado (ej. "+54 9 11 ...")
      const phoneNumberId = phone.id;
      
      // Un WABA puede tener números de varios nodos: el nodo elegido se le
      // asigna solo a los números NUEVOS. Los que ya existen conservan su
      // dueño (id_nodo no se toca); para moverlos, se edita el número.
      const [res]: any = await db.query(
        `INSERT INTO crm_cuentas (id_nodo, canal, identificador, waba_id, token, activo)
         VALUES (?, 'whatsapp', ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE waba_id = VALUES(waba_id), token = VALUES(token), activo = 1`,
        [idNodo, phoneNumberId, waba_id, access_token]
      );
      // mysql2: affectedRows = 1 si insertó, 2 si actualizó, 0 si no cambió nada.
      if (res?.affectedRows === 1) nuevos++;
      else existentes++;
    }

    return NextResponse.json({
      success: true,
      message:
        `${autoMode ? 'Sincronización automática: ' : ''}${nuevos} número(s) nuevo(s) asignado(s) a este nodo` +
        (existentes > 0 ? `, ${existentes} ya existente(s) conservan su nodo` : '') + '.',
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
