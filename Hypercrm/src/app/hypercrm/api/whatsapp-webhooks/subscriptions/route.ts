import { NextResponse } from 'next/server';
import { graphFetch, getAppId, WHATSAPP_WEBHOOK_FIELDS } from '@/lib/metaGraph';

const OBJECT = 'whatsapp_business_account';

// Lee la suscripción real del app a nivel de Graph API (/{app_id}/subscriptions)
export async function GET() {
  const appId = getAppId();
  if (!appId) {
    return NextResponse.json({ success: false, error: 'Falta NEXT_PUBLIC_META_APP_ID en el servidor' }, { status: 500 });
  }

  const { ok, data, status } = await graphFetch(`${appId}/subscriptions`);

  if (!ok) {
    return NextResponse.json({ success: false, error: data?.error?.message || 'Error consultando suscripciones en Meta' }, { status });
  }

  const subscriptions: any[] = data?.data || [];
  const current = subscriptions.find((s) => s.object === OBJECT) || null;

  return NextResponse.json({
    success: true,
    subscription: current
      ? { fields: (current.fields || []).map((f: any) => f.name || f), active: !!current.active, callback_url: current.callback_url }
      : null,
    available_fields: WHATSAPP_WEBHOOK_FIELDS,
  });
}

// Da de alta o actualiza los campos suscriptos del objeto whatsapp_business_account
export async function POST(req: Request) {
  const appId = getAppId();
  if (!appId) {
    return NextResponse.json({ success: false, error: 'Falta NEXT_PUBLIC_META_APP_ID en el servidor' }, { status: 500 });
  }

  const verifyToken = process.env.META_VERIFY_TOKEN;
  if (!verifyToken) {
    return NextResponse.json({ success: false, error: 'Falta META_VERIFY_TOKEN en el servidor' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const fields: string[] = Array.isArray(body?.fields) ? body.fields : [];

    const invalid = fields.filter((f) => !(WHATSAPP_WEBHOOK_FIELDS as readonly string[]).includes(f));
    if (invalid.length > 0) {
      return NextResponse.json({ success: false, error: `Campos inválidos: ${invalid.join(', ')}` }, { status: 400 });
    }
    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'Elegí al menos un campo para suscribir' }, { status: 400 });
    }

    // Receptor multi-tenant: valida firma HMAC, resuelve el nodo dueño de
    // cada phone_number_id vía crm_cuentas, corre el motor de bot y
    // reenvía el evento crudo al nodo correspondiente.
    const callbackUrl = `https://crm.hyperisp.com.ar/hypercrm/api/whatsapp-webhooks/messages/`;

    const { ok, data, status } = await graphFetch(
      `${appId}/subscriptions`,
      {
        object: OBJECT,
        callback_url: callbackUrl,
        verify_token: verifyToken,
        fields: fields.join(','),
        include_values: 'true',
      },
      'POST'
    );

    if (!ok || !data?.success) {
      return NextResponse.json({ success: false, error: data?.error?.message || 'Meta rechazó la suscripción' }, { status: status || 400 });
    }

    return NextResponse.json({ success: true, message: `Suscripción guardada con ${fields.length} campo(s).` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Elimina la suscripción del app al objeto whatsapp_business_account
export async function DELETE() {
  const appId = getAppId();
  if (!appId) {
    return NextResponse.json({ success: false, error: 'Falta NEXT_PUBLIC_META_APP_ID en el servidor' }, { status: 500 });
  }

  const { ok, data, status } = await graphFetch(`${appId}/subscriptions`, { object: OBJECT }, 'DELETE');

  if (!ok || !data?.success) {
    return NextResponse.json({ success: false, error: data?.error?.message || 'Error eliminando la suscripción' }, { status: status || 400 });
  }

  return NextResponse.json({ success: true, message: 'Suscripción eliminada.' });
}
