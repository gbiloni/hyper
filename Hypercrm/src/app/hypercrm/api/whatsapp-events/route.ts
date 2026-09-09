import db from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// SSE (Server-Sent Events): mientras el operador tiene la bandeja abierta,
// esta conexión queda escuchando y le avisa apenas hay un mensaje nuevo o
// actualizado en su nodo, para refrescar al toque en vez de esperar el
// polling de 15s de la pantalla (que sigue activo como red de seguridad si
// el navegador no puede sostener esta conexión — proxy corporativo, etc).
//
// No usa un event emitter en memoria (que se rompería si el proceso corre en
// más de una instancia de PM2, o se pierde en un restart) — en cambio
// consulta el MAX(id) de mensajes del nodo cada 2s. Es más liviano de lo que
// suena: un MAX(id) filtrado por id_nodo es una consulta muy barata, y como
// la fuente de verdad siempre es la base, no importa qué instancia haya
// procesado el webhook.
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const idNodoStr = cookieStore.get('hyperisp_active_node_id')?.value;
  const idNodo = idNodoStr ? parseInt(idNodoStr, 10) : 1;

  const encoder = new TextEncoder();
  let ultimoId = 0;
  let cerrado = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Arranca desde el máximo actual: el cliente ya tiene esos mensajes del
      // load inicial, así que no hay que avisarle de algo que ya vio.
      try {
        const [rows]: any = await db.query(
          `SELECT MAX(id) as maxId FROM whatsapp_messages WHERE id_nodo = ?`,
          [idNodo]
        );
        ultimoId = rows?.[0]?.maxId || 0;
      } catch {
        ultimoId = 0;
      }

      const enviar = (evento: string, data: string) => {
        if (cerrado) return;
        try {
          controller.enqueue(encoder.encode(`event: ${evento}\ndata: ${data}\n\n`));
        } catch {
          // El controller ya pudo haberse cerrado por una desconexión que
          // todavía no procesó el listener de "abort" — no hay nada que hacer.
        }
      };

      const chequear = async () => {
        if (cerrado) return;
        try {
          const [rows]: any = await db.query(
            `SELECT MAX(id) as maxId FROM whatsapp_messages WHERE id_nodo = ?`,
            [idNodo]
          );
          const maxId = rows?.[0]?.maxId || 0;
          if (maxId !== ultimoId) {
            ultimoId = maxId;
            enviar('nuevo-mensaje', JSON.stringify({ maxId }));
          }
        } catch {
          // Un error puntual de DB no corta el stream; se reintenta en el
          // próximo tick.
        }
      };

      const intervalo = setInterval(chequear, 2000);
      // Mantiene viva la conexión a través de proxies que cortan streams
      // idle (nginx, balanceadores) aunque no haya mensajes nuevos.
      const heartbeat = setInterval(() => enviar('heartbeat', '{}'), 15000);

      req.signal.addEventListener('abort', () => {
        cerrado = true;
        clearInterval(intervalo);
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Nginx bufferea respuestas por default, lo que rompe el streaming de
      // SSE (no llega nada hasta que el buffer se llena o se corta la
      // conexión). Este header lo desactiva sin tocar la config del server.
      'X-Accel-Buffering': 'no',
    },
  });
}
