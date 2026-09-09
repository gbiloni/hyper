import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

// Credenciales del softphone (JsSIP) para el agente logueado. Devuelve
// SOLO el interno del usuario de la sesión actual -- nunca el de otro
// agente, así que no acepta ningún id por parámetro. La respuesta lleva
// un secret real de SIP: nunca cachear ni loguear este body.
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("hyperisp_session");
    if (!session?.value) {
      return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
    }

    let idUsuario: number | null = null;
    try {
      idUsuario = JSON.parse(session.value)?.id ?? null;
    } catch {
      // Cookie con formato viejo (solo el id como string plano)
      idUsuario = Number(session.value) || null;
    }
    if (!idUsuario) {
      return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
    }

    const idNodo = parseInt(cookieStore.get("hyperisp_active_node_id")?.value || "1", 10);

    const [rows]: any = await db.query(
      `SELECT extension, secret, ws_uri, sip_domain
       FROM crm_agente_extension
       WHERE id_usuario = ? AND id_nodo = ? AND activo = 1
       LIMIT 1`,
      [idUsuario, idNodo]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Este usuario todavía no tiene un interno de telefonía configurado en este nodo." },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0], {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("Error obteniendo credenciales de telefonía:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
