import { NextResponse } from 'next/server';
import { GRAPH_VERSION } from '@/lib/metaGraph';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { vincularCiudades, resolverIdNodos } from '../ciudades';
import { pedirSyncContactos } from '@/lib/whatsappSyncInicial';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, waba_id, phone_number_id, id_nodos } = body;

    const cookieStore = await cookies();
    const idNodoStr = cookieStore.get("hyperisp_active_node_id")?.value;
    const nodos = resolverIdNodos(id_nodos, idNodoStr);

    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appSecret) {
      console.error("META_APP_SECRET no está configurado en .env.local");
      return NextResponse.json({ success: false, error: 'Falta META_APP_SECRET en el servidor' }, { status: 500 });
    }

    // Intercambiar code por Access Token en Meta
    const tokenUrl = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
    
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Error de Meta en exchange:", tokenData);
      return NextResponse.json({ success: false, error: tokenData.error?.message || 'Error obteniendo token de Meta' }, { status: 400 });
    }

    const accessToken = tokenData.access_token;

    // Obtener detalles del teléfono (display_name) desde Meta Graph
    const phoneUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${phone_number_id}?access_token=${accessToken}`;
    const phoneRes = await fetch(phoneUrl);
    const phoneData = await phoneRes.json();
    
    const displayName = phoneData.display_phone_number || phone_number_id;

    // Guardar en crm_cuentas localmente (incluye el waba_id que ya trae el
    // flujo de Embedded Signup, para poder sincronizar automáticamente
    // después sin pedirle a nadie que lo vuelva a pegar a mano).
    await db.query(
      `INSERT INTO crm_cuentas (id_nodo, canal, identificador, waba_id, token, activo)
       VALUES (?, 'whatsapp', ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE waba_id = VALUES(waba_id), token = VALUES(token), activo = 1, id_nodo = VALUES(id_nodo)`,
      [Math.min(...nodos), phone_number_id, waba_id || null, accessToken]
    );
    await vincularCiudades('whatsapp', phone_number_id, nodos);

    // Coexistence: si el número también vive en la app del celular, se pide a
    // Meta (una sola vez, dentro de las 24 h del alta) la agenda de contactos.
    // Nunca rompe el alta: si falla, la cuenta queda vinculada igual.
    const sync = await pedirSyncContactos(phone_number_id, accessToken, { db });
    if (sync.estado !== 'solicitado') {
      console.log(`[WHATSAPP-SYNC] Agenda no pedida para ${phone_number_id}: ${sync.estado === 'error' ? 'error — ' : ''}${sync.motivo}`);
    }

    return NextResponse.json({ success: true, message: 'Cuenta vinculada exitosamente', sync_contactos: sync.estado });

  } catch (error: any) {
    console.error('Error en exchange local de whatsapp:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
