import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionContext } from "@/lib/hypercrmSession";
import { isValidExtension, syncExtensionUpsert, syncExtensionDelete, generateSipSecret } from "@/lib/issabelSync";

export const dynamic = "force-dynamic";

const ISSABEL_WS_URI = "wss://sip01.hyperisp.com.ar:8089/ws";
const ISSABEL_SIP_DOMAIN = "sip01.hyperisp.com.ar";

// Lista las extensiones del nodo activo (con el nombre del agente) y, aparte,
// los usuarios del nodo que todavía no tienen una asignada -- así el
// formulario de alta solo ofrece candidatos válidos.
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });

  try {
    const [extensiones]: any = await db.query(
      `SELECT e.id, e.id_usuario, e.extension, e.activo, e.created_at,
              u.nombre AS agente_nombre, u.username AS agente_username
       FROM crm_agente_extension e
       JOIN usuario u ON u.id = e.id_usuario
       WHERE e.id_nodo = ?
       ORDER BY e.extension`,
      [ctx.idNodo]
    );

    const [agentesDisponibles]: any = await db.query(
      `SELECT u.id, u.nombre, u.username
       FROM usuario u
       WHERE u.activo = 1
         AND u.id NOT IN (
           SELECT id_usuario FROM crm_agente_extension WHERE id_nodo = ?
         )
       ORDER BY u.nombre`,
      [ctx.idNodo]
    );

    return NextResponse.json({ extensiones, agentesDisponibles }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("Error listando extensiones:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// Alta de una extensión nueva para un agente del nodo activo. El secret se
// genera acá (nunca lo elige el usuario) y se empuja a Issabel ANTES de
// tocar la base -- si Issabel rechaza el sync, no queda una fila local
// apuntando a un interno que no existe de verdad.
export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });

  try {
    const body = await req.json();
    const idUsuario = Number(body?.id_usuario);
    const extension = String(body?.extension || "").trim();

    if (!idUsuario) {
      return NextResponse.json({ error: "Falta el agente." }, { status: 400 });
    }
    if (!isValidExtension(extension)) {
      return NextResponse.json({ error: "El interno debe tener entre 3 y 6 dígitos." }, { status: 400 });
    }

    const [existente]: any = await db.query(
      `SELECT id FROM crm_agente_extension WHERE id_nodo = ? AND id_usuario = ?`,
      [ctx.idNodo, idUsuario]
    );
    if (existente.length > 0) {
      return NextResponse.json({ error: "Ese agente ya tiene un interno asignado en este nodo." }, { status: 409 });
    }

    const [choque]: any = await db.query(
      `SELECT id FROM crm_agente_extension WHERE id_nodo = ? AND extension = ?`,
      [ctx.idNodo, extension]
    );
    if (choque.length > 0) {
      return NextResponse.json({ error: "Ese número de interno ya está en uso en este nodo." }, { status: 409 });
    }

    const secret = generateSipSecret();
    await syncExtensionUpsert(extension, secret);

    try {
      await db.query(
        `INSERT INTO crm_agente_extension (id_usuario, id_nodo, extension, secret, ws_uri, sip_domain, activo)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [idUsuario, ctx.idNodo, extension, secret, ISSABEL_WS_URI, ISSABEL_SIP_DOMAIN]
      );
    } catch (dbError) {
      // El interno ya quedó creado en Issabel -- deshacerlo para no dejar un
      // endpoint huérfano sin fila local que lo represente.
      await syncExtensionDelete(extension).catch((e) =>
        console.error(`No se pudo revertir el interno ${extension} en Issabel tras fallo de DB:`, e)
      );
      throw dbError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error creando extensión:", error);
    return NextResponse.json({ error: error.message || "Error interno." }, { status: 500 });
  }
}
