import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionContext } from "@/lib/hypercrmSession";
import { isValidQueueName, isValidStrategy, syncQueueUpsert, syncQueueDelete } from "@/lib/issabelSync";

export const dynamic = "force-dynamic";

function parseMiembros(miembros: unknown): string[] {
  if (!Array.isArray(miembros)) return [];
  return miembros.map((m) => String(m).trim()).filter(Boolean);
}

// Gestión de colas: 100% admin-only. A diferencia de los internos, acá no
// hay un caso de "consulta propia" -- un agente no necesita ver la
// composición de las colas para atender su interno.
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  if (!ctx.esAdmin) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  try {
    const [colas]: any = await db.query(
      `SELECT * FROM crm_colas WHERE id_nodo = ? ORDER BY nombre`,
      [ctx.idNodo]
    );
    const [extensiones]: any = await db.query(
      `SELECT e.extension, u.nombre AS agente_nombre
       FROM crm_agente_extension e
       JOIN usuario u ON u.id = e.id_usuario
       WHERE e.id_nodo = ? AND e.activo = 1
       ORDER BY e.extension`,
      [ctx.idNodo]
    );
    return NextResponse.json({ colas, extensionesDisponibles: extensiones }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("Error listando colas:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  if (!ctx.esAdmin) {
    return NextResponse.json({ error: "Solo un administrador puede crear colas." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const nombre = String(body?.nombre || "").trim();
    const estrategia = String(body?.estrategia || "ringall");
    const timeout = parseInt(body?.timeout_segundos, 10) || 20;
    const miembros = parseMiembros(body?.miembros);

    if (!isValidQueueName(nombre)) {
      return NextResponse.json({ error: "Nombre de cola inválido (minúsculas, números, - o _, empieza con letra)." }, { status: 400 });
    }
    if (!isValidStrategy(estrategia)) {
      return NextResponse.json({ error: "Estrategia inválida." }, { status: 400 });
    }
    if (timeout < 5 || timeout > 300) {
      return NextResponse.json({ error: "Timeout debe estar entre 5 y 300 segundos." }, { status: 400 });
    }

    const [existente]: any = await db.query(
      `SELECT id FROM crm_colas WHERE id_nodo = ? AND nombre = ?`,
      [ctx.idNodo, nombre]
    );
    if (existente.length > 0) {
      return NextResponse.json({ error: "Ya existe una cola con ese nombre en este nodo." }, { status: 409 });
    }

    await syncQueueUpsert(nombre, estrategia, timeout, miembros);

    try {
      await db.query(
        `INSERT INTO crm_colas (id_nodo, nombre, estrategia, timeout_segundos, miembros, activo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [ctx.idNodo, nombre, estrategia, timeout, miembros.join(",")]
      );
    } catch (dbError) {
      await syncQueueDelete(nombre).catch((e) =>
        console.error(`No se pudo revertir la cola ${nombre} en Issabel tras fallo de DB:`, e)
      );
      throw dbError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error creando cola:", error);
    return NextResponse.json({ error: error.message || "Error interno." }, { status: 500 });
  }
}
