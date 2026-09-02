// Helper compartido para llamar a la Graph API de Meta a nivel de "app"
// (no de número/WABA). Se usa para las features de Settings > WhatsApp que
// necesitan el App Access Token (APP_ID|APP_SECRET): webhooks del app y
// salud/uso de la API.

export const GRAPH_VERSION = 'v20.0';

/**
 * Arma el App Access Token de Meta a partir de las credenciales del servidor.
 * Devuelve null si falta alguna, para que el caller responda 500 con un
 * mensaje claro en vez de mandar "undefined|undefined" a Meta.
 */
export function getAppAccessToken(): string | null {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;
  return `${appId}|${appSecret}`;
}

export function getAppId(): string | null {
  return process.env.NEXT_PUBLIC_META_APP_ID || null;
}

interface AppUsage {
  call_count: number;
  total_cputime: number;
  total_time: number;
}

interface GraphFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T;
  appUsage: AppUsage | null;
}

/**
 * Llama a la Graph API con el App Access Token. `path` va sin barra inicial
 * (ej. "4353172688272823/subscriptions"). `params` se manda como query string
 * en GET/DELETE y como body x-www-form-urlencoded en POST.
 */
export async function graphFetch<T = any>(
  path: string,
  params: Record<string, string> = {},
  method: 'GET' | 'POST' | 'DELETE' = 'GET'
): Promise<GraphFetchResult<T>> {
  const token = getAppAccessToken();
  if (!token) {
    return { ok: false, status: 500, data: { error: { message: 'Falta NEXT_PUBLIC_META_APP_ID o META_APP_SECRET en el servidor' } } as any, appUsage: null };
  }

  const baseUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;
  const search = new URLSearchParams({ ...params, access_token: token });

  let res: Response;
  if (method === 'GET' || method === 'DELETE') {
    res = await fetch(`${baseUrl}?${search.toString()}`, { method });
  } else {
    res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: search.toString(),
    });
  }

  const data = await res.json().catch(() => ({}));

  let appUsage: AppUsage | null = null;
  const usageHeader = res.headers.get('x-app-usage');
  if (usageHeader) {
    try {
      appUsage = JSON.parse(usageHeader);
    } catch {
      appUsage = null;
    }
  }

  return { ok: res.ok, status: res.status, data, appUsage };
}

/** Clasifica el % de uso siguiendo el mismo criterio que usa el dashboard de Meta. */
export function classifyUsage(usagePercentage: number): 'healthy' | 'warning' | 'critical' | 'throttled' {
  if (usagePercentage >= 100) return 'throttled';
  if (usagePercentage >= 90) return 'critical';
  if (usagePercentage >= 70) return 'warning';
  return 'healthy';
}

/** Campos válidos del objeto whatsapp_business_account para suscripción de webhooks. */
export const WHATSAPP_WEBHOOK_FIELDS = [
  'account_alerts',
  'account_review_update',
  'account_settings_update',
  'account_update',
  'automatic_events',
  'business_capability_update',
  'business_status_update',
  'business_username_updates',
  'calls',
  'flows',
  'group_lifecycle_update',
  'group_participants_update',
  'group_settings_update',
  'group_status_update',
  'history',
  'message_echoes',
  'message_template_components_update',
  'message_template_quality_update',
  'message_template_status_update',
  'messages',
  'messaging_handovers',
  'partner_solutions',
  'payment_configuration_update',
  'phone_number_name_update',
  'phone_number_quality_update',
  'security',
  'smb_app_state_sync',
  'smb_message_echoes',
  'standby',
  'template_category_update',
  'template_correct_category_detection',
  'tracking_events',
  'user_preferences',
] as const;
