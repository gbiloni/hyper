import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionContext } from "@/lib/hypercrmSession";
import { isValidStrategy, syncQueueUpsert, syncQueueDelete } from "@/lib/issabelSync";

export const dynamic = "force-dynamic";

function parseMiembros(miembros: unknown): string[] {
  if (!Array.isArray(miembros)) return [];
  return miembros.map((m) => String(m).trim()).filter(Boolean);
}

// Edita estrategia/timeout/miembros de una cola existente, o la
// activa/desactiva. El nombre de la cola no se puede cambiar (mismo criterio
// que con las extensiones -- borrar y crear de nuevo si hace falta).
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  if (!ctx.esAdmin) {
    return NextResponse.json({ error: "Solo un administrador puede modificar colas." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const [rows]: any = await db.query(`SELECT * FROM crm_colas WHERE id = ? AND id_nodo = ?`, [id, ctx.idNodo]);
    if (rows.length === 0) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
    const fila = rows[0];

    if (body?.accion === "desactivar") {
      await syncQueueDelete(fila.nombre);
      await db.query(`UPDATE crm_colas SET activo = 0 WHERE id = ?`, [id]);
      return NextResponse.json({ success: true });
    }

    if (body?.accion === "activar") {
      const miembros = (fila.miembros || "").split(",").filter(Boolean);
      await syncQueueUpsert(fila.nombre, fila.estrategia, fila.timeout_segundos, miembros);
      await db.query(`UPDATE crm_colas SET activo = 1 WHERE id = ?`, [id]);
      return NextResponse.json({ success: true });
    }

    // Edición de estrategia/timeout/miembros
    const estrategia = String(body?.estrategia || fila.estrategia);
    const timeout = parseInt(body?.timeout_segundos, 10) || fila.timeout_segundos;
    const miembros = body?.miembros !== undefined ? parseMiembros(body.miembros) : (fila.miembros || "").split(",").filter(Boolean);

    if (!isValidStrategy(estrategia)) {
      return NextResponse.json({ error: "Estrategia inválida." }, { status: 400 });
    }
    if (timeout < 5 || timeout > 300) {
      return NextResponse.json({ error: "Timeout debe estar entre 5 y 300 segundos." }, { status: 400 });
    }

    await syncQueueUpsert(fila.nombre, estrategia, timeout, miembros);
    await db.query(
      `UPDATE crm_colas SET estrategia = ?, timeout_segundos = ?, miembros = ? WHERE id = ?`,
      [estrategia, timeout, miembros.join(","), id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error actualizando cola:", error);
    return NextResponse.json({ error: error.message || "Error interno." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  if (!ctx.esAdmin) {
    return NextResponse.json({ error: "Solo un administrador puede eliminar colas." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const [rows]: any = await db.query(`SELECT nombre FROM crm_colas WHERE id = ? AND id_nodo = ?`, [id, ctx.idNodo]);
    if (rows.length === 0) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

    await syncQueueDelete(rows[0].nombre);
    await db.query(`DELETE FROM crm_colas WHERE id = ? AND id_nodo = ?`, [id, ctx.idNodo]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error eliminando cola:", error);
    return NextResponse.json({ error: error.message || "Error interno." }, { status: 500 });
  }
}
