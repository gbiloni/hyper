import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionContext } from "@/lib/hypercrmSession";
import { syncExtensionUpsert, syncExtensionDelete, generateSipSecret } from "@/lib/issabelSync";

export const dynamic = "force-dynamic";

// Activar/desactivar/regenerar secret. Cambiar el NÚMERO de interno no está
// soportado acá a propósito -- para eso, borrar y dar de alta de nuevo (menos
// casos borde que reimplementar un "rename" seguro en Asterisk).
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  if (!ctx.esAdmin) {
    return NextResponse.json({ error: "Solo un administrador puede modificar internos." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const accion = body?.accion;

    const [rows]: any = await db.query(
      `SELECT * FROM crm_agente_extension WHERE id = ? AND id_nodo = ?`,
      [id, ctx.idNodo]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "No encontrado." }, { status: 404 });
    }
    const fila = rows[0];

    if (accion === "desactivar") {
      await syncExtensionDelete(fila.extension);
      await db.query(`UPDATE crm_agente_extension SET activo = 0 WHERE id = ?`, [id]);
    } else if (accion === "activar" || accion === "regenerar_secret") {
      const secret = generateSipSecret();
      await syncExtensionUpsert(fila.extension, secret);
      await db.query(`UPDATE crm_agente_extension SET activo = 1, secret = ? WHERE id = ?`, [secret, id]);
    } else {
      return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error actualizando extensión:", error);
    return NextResponse.json({ error: error.message || "Error interno." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "No hay sesión activa." }, { status: 401 });
  if (!ctx.esAdmin) {
    return NextResponse.json({ error: "Solo un administrador puede eliminar internos." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const [rows]: any = await db.query(
      `SELECT extension FROM crm_agente_extension WHERE id = ? AND id_nodo = ?`,
      [id, ctx.idNodo]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "No encontrado." }, { status: 404 });
    }

    await syncExtensionDelete(rows[0].extension);
    await db.query(`DELETE FROM crm_agente_extension WHERE id = ? AND id_nodo = ?`, [id, ctx.idNodo]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error eliminando extensión:", error);
    return NextResponse.json({ error: error.message || "Error interno." }, { status: 500 });
  }
}
