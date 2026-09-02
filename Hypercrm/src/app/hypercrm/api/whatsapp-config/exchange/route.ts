import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, waba_id, phone_number_id } = body;

    const cookieStore = await cookies();
    const idNodoStr = cookieStore.get("hyperisp_active_node_id")?.value;
    const idNodo = idNodoStr ? parseInt(idNodoStr, 10) : 1;

    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appSecret) {
      console.error("META_APP_SECRET no está configurado en .env.local");
      return NextResponse.json({ success: false, error: 'Falta META_APP_SECRET en el servidor' }, { status: 500 });
    }

    // Intercambiar code por Access Token en Meta
    const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
    
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Error de Meta en exchange:", tokenData);
      return NextResponse.json({ success: false, error: tokenData.error?.message || 'Error obteniendo token de Meta' }, { status: 400 });
    }

    const accessToken = tokenData.access_token;

    // Obtener detalles del teléfono (display_name) desde Meta Graph
    const phoneUrl = `https://graph.facebook.com/v20.0/${phone_number_id}?access_token=${accessToken}`;
    const phoneRes = await fetch(phoneUrl);
    const phoneData = await phoneRes.json();
    
    const displayName = phoneData.display_phone_number || phone_number_id;

    // Guardar en crm_cuentas localmente
    await db.query(
      `INSERT INTO crm_cuentas (id_nodo, canal, identificador, token, activo)
       VALUES (?, 'whatsapp', ?, ?, 1)
       ON DUPLICATE KEY UPDATE token = ?, activo = 1`,
      [idNodo, phone_number_id, accessToken, accessToken]
    );

    return NextResponse.json({ success: true, message: 'Cuenta vinculada exitosamente' });

  } catch (error: any) {
    console.error('Error en exchange local de whatsapp:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
