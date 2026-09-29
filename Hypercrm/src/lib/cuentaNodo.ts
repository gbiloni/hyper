// Cada cuenta de crm_cuentas (un número de WhatsApp, un bot de Telegram, etc.)
// pertenece a UN solo nodo: crm_cuentas.id_nodo. Un nodo sí puede tener varias
// cuentas (por ejemplo un número de Soporte y otro de Ventas).
// Antes una cuenta podía atender varias ciudades (tabla crm_cuentas_nodos);
// ese modelo se eliminó en la migración sql/2026-09-28-un-nodo-por-numero.sql.

/**
 * Devuelve el nodo elegido en el formulario, o null si no es válido.
 * - `id_nodo`: lo que manda la pantalla de Números actual.
 * - `id_nodos[]`: lo que mandaba la pantalla vieja (varias ciudades). Se
 *   acepta solo si trae exactamente uno, para que una pestaña abierta desde
 *   antes del cambio no asigne un nodo al azar.
 * - Sin ninguno de los dos: el nodo activo de la cookie (llamadas por API).
 */
export function resolverIdNodo(body: any, idNodoCookie?: string): number | null {
  const valido = (v: unknown) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  if (body?.id_nodo !== undefined && body?.id_nodo !== null && body?.id_nodo !== '') {
    return valido(body.id_nodo);
  }
  if (Array.isArray(body?.id_nodos)) {
    const lista = body.id_nodos.map(valido).filter((n: number | null) => n !== null);
    return lista.length === 1 ? lista[0] : null;
  }
  return valido(idNodoCookie);
}

export const ERROR_NODO = 'Elegí el nodo (ciudad) al que pertenece este número. Cada número pertenece a un solo nodo.';
