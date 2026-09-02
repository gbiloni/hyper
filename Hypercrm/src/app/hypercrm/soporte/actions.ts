"use server";

import { getApiConfig } from "@/lib/getApiConfig";

export async function getClienteByCelular(celular: string) {
  try {
    const { apiUrl, token } = await getApiConfig();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${apiUrl}/clientes?celular=${encodeURIComponent(celular)}`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      response = await fetch(`${apiUrl}/clientes/1/dashboard`, {
        method: 'GET',
        headers,
        cache: 'no-store'
      });
      if (!response.ok) {
        return { error: `No se encontró cliente con celular ${celular} y falló fallback.` };
      }
    }

    const data = await response.json();
    return { data };
  } catch (error: any) {
    console.error("Error al obtener cliente por celular:", error);
    return { error: "Error de comunicación con Java." };
  }
}

export async function getChatsOmnicanal() {
  try {
    const { default: pool } = await import('@/lib/db');
    
    // Obtenemos los últimos mensajes agrupados por remitente (simplificado para mostrar en bandeja)
    const sql = `
      SELECT 
        remitente_nro as phone,
        canal as channel,
        MAX(fecha_recepcion) as last_time,
        SUM(CASE WHEN leido = 0 AND direccion = 'ENTRANTE' THEN 1 ELSE 0 END) as unread,
        (SELECT cuerpo_mensaje FROM wapp_mensajes wm2 WHERE wm2.remitente_nro = wm.remitente_nro ORDER BY fecha_recepcion DESC LIMIT 1) as lastMessage
      FROM wapp_mensajes wm
      GROUP BY remitente_nro, canal
      ORDER BY last_time DESC
      LIMIT 50
    `;
    
    const [rows]: any = await pool.query(sql);
    
    if (rows && rows.length > 0) {
      const chats = await Promise.all(rows.map(async (row: any, index: number) => {
        // Para cada chat, traemos los últimos mensajes (historial)
        const msgSql = `
          SELECT id, cuerpo_mensaje as text, direccion, DATE_FORMAT(fecha_recepcion, '%h:%i %p') as time
          FROM wapp_mensajes
          WHERE remitente_nro = ?
          ORDER BY id ASC
          LIMIT 50
        `;
        const [msgRows]: any = await pool.query(msgSql, [row.phone]);
        
        const messages = msgRows.map((m: any) => ({
          id: String(m.id),
          sender: m.direccion === 'ENTRANTE' ? 'client' : 'agent',
          text: m.text || '',
          time: m.time
        }));

        return {
          id: String(index + 1), // O usar remitente_nro
          name: row.phone, // Por ahora el nombre es el teléfono (hasta vincular con cliente)
          phone: row.phone,
          avatar: row.phone.substring(0, 2),
          channel: row.channel || 'whatsapp',
          lastMessage: row.lastMessage || 'Mensaje adjunto',
          time: new Date(row.last_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: Number(row.unread) || 0,
          botActive: false,
          messages
        };
      }));

      return { chats };
    }
    
    return { chats: [] };
  } catch (err) {
    console.error("Error al obtener chats locales de wapp_mensajes:", err);
    return { chats: [] };
  }
}

export async function enviarMensajeMeta(chatId: string, phone: string, message: string) {
  try {
    // Si no necesitamos Java, enviamos usando nuestro propio endpoint Outbound Centralizado de NextJS
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    
    // Buscamos el canal activo por el phone
    const { default: pool } = await import('@/lib/db');
    const [rows]: any = await pool.query(
      "SELECT canal, identificador FROM crm_cuentas WHERE activo = 1 ORDER BY id ASC LIMIT 1"
    );
    
    if (rows && rows.length > 0) {
      const canal = rows[0].canal;
      const cuentaEmisora = rows[0].identificador;
      
      const response = await fetch(`${appUrl}/api/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          canal: canal, 
          cuenta_emisora: cuentaEmisora, 
          destinatario: phone, 
          texto: message 
        })
      });

      if (response.ok) {
        return { success: true };
      }
    }
  } catch (err) {
    console.error("Error enviando mensaje por API Centralizada:", err);
  }

  return { success: false };
}
