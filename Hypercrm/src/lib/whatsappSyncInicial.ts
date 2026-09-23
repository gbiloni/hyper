// Coexistence: al dar de alta un número que ya usa la WhatsApp Business App,
// Meta deja pedir UNA sola vez, dentro de las 24 h del alta, dos
// sincronizaciones con POST /{phone_number_id}/smb_app_data:
//   1) sync_type "smb_app_state_sync": la agenda de la app. Llega por el
//      webhook smb_app_state_sync (whatsappContactos.ts).
//   2) sync_type "history": hasta 180 días de chats. Llega por el webhook
//      history (whatsappHistorial.ts). Si el negocio no aceptó compartir el
//      historial, llega un único webhook con el error 2593109.
// Meta pide hacerlas en ese orden: primero contactos, después historial.
//
// Reglas que respeta este módulo:
//   - Solo pide si Meta confirma que el número está en coexistencia
//     (is_on_biz_app = true); en un alta común el endpoint devolvería error.
//   - Guarda request_id y hora de cada pedido en crm_cuentas. Si ya hay un
//     pedido de las últimas 24 h (mismo alta), no lo repite. Uno más viejo es
//     de un alta anterior (el cliente pudo desconectarse y volver) y no bloquea.
//   - Si no puede verificar si ya se pidió (ej. falta la migración), NO pide:
//     gastar la única oportunidad a ciegas es peor que perderla.
//   - Nunca lanza: un fallo acá no debe romper el alta del número.

import type { DbLike } from './whatsappEchoes';

const VENTANA_HORAS = 24;
const TIMEOUT_MS = 10_000;

export interface SyncDeps {
  db: DbLike;
  /** Versión de la Graph API (GRAPH_VERSION de metaGraph.ts). */
  graphVersion: string;
  fetchFn?: typeof fetch;
}

export type ResultadoSync =
  | { estado: 'solicitado'; requestId: string | null }
  | { estado: 'omitido'; motivo: string }
  | { estado: 'error'; motivo: string };

export interface ResultadoSyncInicial {
  contactos: ResultadoSync;
  historial: ResultadoSync;
}

type TipoSync = 'smb_app_state_sync' | 'history';

// Columnas de constancia por tipo (nombres fijos, nunca vienen de afuera).
const COLUMNAS: Record<TipoSync, { id: string; at: string; migracion: string }> = {
  smb_app_state_sync: { id: 'sync_contactos_request_id', at: 'sync_contactos_at', migracion: '2026-09-20' },
  history: { id: 'sync_historial_request_id', at: 'sync_historial_at', migracion: '2026-09-23' },
};

async function graph(fetchFn: typeof fetch, url: string, token: string, init: RequestInit = {}) {
  const res = await fetchFn(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data: any = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function mensajeDeMeta(data: any): string {
  const e = data?.error;
  if (!e) return 'respuesta inesperada de Meta';
  return `${e.message || 'error de Meta'}${e.code ? ` (#${e.code})` : ''}`;
}

async function pedirUno(
  tipo: TipoSync,
  phoneNumberId: string,
  accessToken: string,
  base: string,
  db: DbLike,
  fetchFn: typeof fetch
): Promise<ResultadoSync> {
  const col = COLUMNAS[tipo];

  // 1) ¿Ya se pidió en este alta?
  let horas: number | null = null;
  try {
    const [rows]: any = await db.query(
      `SELECT TIMESTAMPDIFF(HOUR, ${col.at}, NOW()) AS horas
         FROM crm_cuentas WHERE canal = 'whatsapp' AND identificador = ? LIMIT 1`,
      [phoneNumberId]
    );
    if (!rows?.[0]) return { estado: 'omitido', motivo: 'la cuenta no existe en crm_cuentas' };
    horas = rows[0].horas ?? null;
  } catch (error: any) {
    console.error(`[WHATSAPP-SYNC] No se pudo verificar si ${tipo} ya se pidió (¿falta la migración ${col.migracion}?):`, error?.message);
    return { estado: 'omitido', motivo: 'no se pudo verificar si ya se pidió' };
  }
  if (horas !== null && horas < VENTANA_HORAS) {
    return { estado: 'omitido', motivo: 'ya se pidió en las últimas 24 h' };
  }

  // 2) Pedir.
  const pedido = await graph(fetchFn, `${base}/smb_app_data`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ messaging_product: 'whatsapp', sync_type: tipo }),
  });
  if (!pedido.ok) {
    return { estado: 'error', motivo: mensajeDeMeta(pedido.data) };
  }
  const requestId: string | null = pedido.data?.request_id ? String(pedido.data.request_id) : null;

  // 3) Dejar constancia. Si esto falla el pedido igual ya salió: se avisa
  // fuerte en el log y se devuelve "solicitado".
  try {
    await db.query(
      `UPDATE crm_cuentas SET ${col.id} = ?, ${col.at} = NOW()
        WHERE canal = 'whatsapp' AND identificador = ?`,
      [requestId, phoneNumberId]
    );
  } catch (error: any) {
    console.error(`[WHATSAPP-SYNC] ${tipo} SE PIDIÓ (request_id ${requestId}) pero no se pudo guardar la constancia:`, error?.message);
  }

  console.log(`✅ [WHATSAPP-SYNC] ${tipo} pedido a Meta para ${phoneNumberId} (request_id ${requestId})`);
  return { estado: 'solicitado', requestId };
}

export async function pedirSyncInicial(
  phoneNumberId: string,
  accessToken: string,
  { db, graphVersion, fetchFn = fetch }: SyncDeps
): Promise<ResultadoSyncInicial> {
  const ambos = (r: ResultadoSync): ResultadoSyncInicial => ({ contactos: r, historial: r });
  try {
    // ¿Es un número en coexistencia? Se consulta una sola vez para los dos.
    const base = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}`;
    const estado = await graph(fetchFn, `${base}?fields=is_on_biz_app,platform_type`, accessToken);
    if (!estado.ok) {
      return ambos({ estado: 'error', motivo: `no se pudo consultar el número: ${mensajeDeMeta(estado.data)}` });
    }
    if (estado.data?.is_on_biz_app !== true) {
      return ambos({ estado: 'omitido', motivo: 'el número no está en coexistencia' });
    }

    const contactos = await pedirUno('smb_app_state_sync', phoneNumberId, accessToken, base, db, fetchFn);
    const historial = await pedirUno('history', phoneNumberId, accessToken, base, db, fetchFn);
    return { contactos, historial };
  } catch (error: any) {
    console.error('[WHATSAPP-SYNC] Error inesperado en la sync inicial:', error?.message);
    return ambos({ estado: 'error', motivo: error?.message || 'error inesperado' });
  }
}
