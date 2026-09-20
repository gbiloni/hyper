// Coexistence: la agenda de la WhatsApp Business App llega por el webhook como
// field "smb_app_state_sync" (value.state_sync[]). Cada item es
// { type: "contact", contact: { full_name, first_name, phone_number },
//   action: "add" | "remove", metadata: { timestamp } }.
//   - "add" significa alta O edición del contacto.
//   - "remove" no trae nombres.
//   - phone_number viene en dígitos (ej. "16505551234"), igual que el "from"
//     de los mensajes entrantes.
// Ojo: la sincronización INICIAL de toda la agenda solo se dispara si se la
// pide una vez con POST /{phone_number_id}/smb_app_data (sync_type
// "smb_app_state_sync") dentro de las 24 h del onboarding. Sin ese pedido solo
// llegan los altas/ediciones/bajas posteriores.

import type { DbLike } from './whatsappEchoes';

export interface ContactosDeps {
  db: DbLike;
  getCuenta(phoneNumberId: string): Promise<{ id_nodo: number } | null>;
}

export interface ResultadoContactos {
  guardados: number;
  eliminados: number;
  ignorados: number;
  conversacionesActualizadas: number;
}

export async function procesarContactos(
  items: any[],
  phoneNumberId: string,
  { db, getCuenta }: ContactosDeps
): Promise<ResultadoContactos> {
  const resultado: ResultadoContactos = { guardados: 0, eliminados: 0, ignorados: 0, conversacionesActualizadas: 0 };

  const cuenta = await getCuenta(phoneNumberId);
  if (!cuenta) {
    console.warn(`[WHATSAPP-WEBHOOK] state_sync ignorado: no hay crm_cuentas activa para phone_number_id ${phoneNumberId}`);
    resultado.ignorados = items.length;
    return resultado;
  }

  for (const item of items) {
    const telefono = String(item?.contact?.phone_number ?? '').replace(/\D/g, '');
    const accion: string | undefined = item?.action;
    if (item?.type !== 'contact' || !telefono || (accion !== 'add' && accion !== 'remove')) {
      resultado.ignorados++;
      continue;
    }

    // Un fallo con un contacto (ej. la tabla todavía no existe) no debe
    // tirar abajo el resto del lote ni los otros handlers del webhook.
    try {
      if (accion === 'remove') {
        await db.query(
          `DELETE FROM whatsapp_contactos WHERE phone_number_id = ? AND phone_number = ?`,
          [phoneNumberId, telefono]
        );
        resultado.eliminados++;
        continue;
      }

      const fullName: string | null = item.contact.full_name || null;
      const firstName: string | null = item.contact.first_name || null;

      await db.query(
        `INSERT INTO whatsapp_contactos (phone_number_id, phone_number, full_name, first_name)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), first_name = VALUES(first_name)`,
        [phoneNumberId, telefono, fullName, firstName]
      );
      resultado.guardados++;

      // Si ya hay una conversación con este número, Soporte la muestra con el
      // nombre de la agenda en vez del teléfono. Solo en "add": al borrar el
      // contacto no se borra el hilo ni se pisa el nombre que ya tenía.
      if (fullName) {
        const [upd]: any = await db.query(
          `UPDATE whatsapp_conversations SET user_name = ?
           WHERE phone_number = ? AND (phone_number_id = ? OR phone_number_id IS NULL)`,
          [fullName, telefono, phoneNumberId]
        );
        resultado.conversacionesActualizadas += upd?.affectedRows ?? 0;
      }
    } catch (error) {
      console.error(`[WHATSAPP-WEBHOOK] Error procesando contacto ${telefono} de state_sync:`, error);
      resultado.ignorados++;
    }
  }

  console.log(
    `✅ state_sync: ${resultado.guardados} guardado(s), ${resultado.eliminados} eliminado(s), ` +
      `${resultado.ignorados} ignorado(s), ${resultado.conversacionesActualizadas} conversación(es) renombrada(s)`
  );
  return resultado;
}
