// Coexistence: al dar de alta un número que ya usa la WhatsApp Business App,
// Meta deja pedir UNA sola vez la agenda de la app con
// POST /{phone_number_id}/smb_app_data { sync_type: "smb_app_state_sync" },
// dentro de las 24 h del alta. Si se lo pide, llegan por el webhook los
// smb_app_state_sync que procesa whatsappContactos.ts.
//
// Reglas que respeta este módulo:
//   - Solo pide la sync si Meta confirma que el número está en coexistencia
//     (is_on_biz_app = true); en un alta común el endpoint devolvería error.
//   - Guarda el request_id y la hora en crm_cuentas. Si ya hay un pedido de
//     las últimas 24 h (mismo alta), no lo repite. Uno más viejo es de un
//     alta anterior (el cliente pudo desconectarse y volver) y no bloquea.
//   - Si no puede verificar si ya se pidió (ej. falta la migración), NO pide:
//     gastar la única oportunidad a ciegas es peor que perderla.
//   - Nunca lanza: un fallo acá no debe romper el alta del número.
// No se pide el historial de mensajes (sync_type "history"): todavía no hay
// handler para el webhook `history`, y tampoco se puede repetir.

import type { DbLike } from './whatsappEchoes';

export const SYNC_GRAPH_VERSION = 'v24.0';
const VENTANA_HORAS = 24;
const TIMEOUT_MS = 10_000;

export interface SyncDeps {
  db: DbLike;
  fetchFn?: typeof fetch;
}

export type ResultadoSync =
  | { estado: 'solicitado'; requestId: string | null }
  | { estado: 'omitido'; motivo: string }
  | { estado: 'error'; motivo: string };

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

export async function pedirSyncContactos(
  phoneNumberId: string,
  accessToken: string,
  { db, fetchFn = fetch }: SyncDeps
): Promise<ResultadoSync> {
  try {
    // 1) ¿Ya se pidió en este alta?
    let horas: number | null = null;
    try {
      const [rows]: any = await db.query(
        `SELECT TIMESTAMPDIFF(HOUR, sync_contactos_at, NOW()) AS horas
           FROM crm_cuentas WHERE canal = 'whatsapp' AND identificador = ? LIMIT 1`,
        [phoneNumberId]
      );
      if (!rows?.[0]) return { estado: 'omitido', motivo: 'la cuenta no existe en crm_cuentas' };
      horas = rows[0].horas ?? null;
    } catch (error: any) {
      console.error('[WHATSAPP-SYNC] No se pudo verificar si la agenda ya se pidió (¿falta la migración 2026-09-20?):', error?.message);
      return { estado: 'omitido', motivo: 'no se pudo verificar si ya se pidió' };
    }
    if (horas !== null && horas < VENTANA_HORAS) {
      return { estado: 'omitido', motivo: 'ya se pidió en las últimas 24 h' };
    }

    // 2) ¿Es un número en coexistencia?
    const base = `https://graph.facebook.com/${SYNC_GRAPH_VERSION}/${phoneNumberId}`;
    const estado = await graph(fetchFn, `${base}?fields=is_on_biz_app,platform_type`, accessToken);
    if (!estado.ok) {
      return { estado: 'error', motivo: `no se pudo consultar el número: ${mensajeDeMeta(estado.data)}` };
    }
    if (estado.data?.is_on_biz_app !== true) {
      return { estado: 'omitido', motivo: 'el número no está en coexistencia' };
    }

    // 3) Pedir la agenda.
    const pedido = await graph(fetchFn, `${base}/smb_app_data`, accessToken, {
      method: 'POST',
      body: JSON.stringify({ messaging_product: 'whatsapp', sync_type: 'smb_app_state_sync' }),
    });
    if (!pedido.ok) {
      return { estado: 'error', motivo: mensajeDeMeta(pedido.data) };
    }
    const requestId: string | null = pedido.data?.request_id ? String(pedido.data.request_id) : null;

    // 4) Dejar constancia. Si esto falla el pedido igual ya salió: se avisa
    // fuerte en el log y se devuelve "solicitado".
    try {
      await db.query(
        `UPDATE crm_cuentas SET sync_contactos_request_id = ?, sync_contactos_at = NOW()
          WHERE canal = 'whatsapp' AND identificador = ?`,
        [requestId, phoneNumberId]
      );
    } catch (error: any) {
      console.error(`[WHATSAPP-SYNC] La agenda SE PIDIÓ (request_id ${requestId}) pero no se pudo guardar la constancia:`, error?.message);
    }

    console.log(`✅ [WHATSAPP-SYNC] Agenda pedida a Meta para ${phoneNumberId} (request_id ${requestId})`);
    return { estado: 'solicitado', requestId };
  } catch (error: any) {
    console.error('[WHATSAPP-SYNC] Error inesperado pidiendo la agenda:', error?.message);
    return { estado: 'error', motivo: error?.message || 'error inesperado' };
  }
}
