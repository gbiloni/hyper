import db from '@/lib/db';
import { NextResponse } from 'next/server';

// ==============================================================
// PUT: Edita una cuenta / número existente, incluidas las ciudades
// vinculadas (reemplaza el set completo en crm_cuentas_nodos).
// ==============================================================
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const idCuenta = Number(id);
    const body = await req.json();
    const { id_nodos, canal, identificador, token, activo } = body;

    // Mismo criterio que en el POST: orden ascendente por id, no el orden
    // de tildado, para que la "ciudad principal" (id_nodo de compatibilidad)
    // sea determinística.
    const nodos: number[] = (Array.isArray(id_nodos) ? id_nodos : [id_nodos].filter(Boolean)).slice().sort((a, b) => a - b);
    if (nodos.length === 0) {
      return NextResponse.json({ error: 'Elegí al menos una ciudad.' }, { status: 400 });
    }

    await db.query(
      `UPDATE crm_cuentas SET id_nodo = ?, canal = ?, identificador = ?, token = ?, activo = ?
       WHERE id = ?`,
      [nodos[0], canal, identificador, token, activo ? 1 : 0, idCuenta]
    );

    // Reemplazo simple del set de ciudades: se borra lo anterior y se
    // reinserta lo elegido, en vez de calcular el diff (son a lo sumo un
    // puñado de filas por cuenta).
    await db.query(`DELETE FROM crm_cuentas_nodos WHERE id_cuenta = ?`, [idCuenta]);
    await db.query(
      `INSERT INTO crm_cuentas_nodos (id_cuenta, id_nodo) VALUES ${nodos.map(() => '(?, ?)').join(', ')}`,
      nodos.flatMap((idNodo) => [idCuenta, idNodo])
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese identificador para ese canal.' }, { status: 409 });
    }
    console.error("Error editando cuenta:", error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// ==============================================================
// DELETE: Elimina una cuenta / número (cualquier canal, cualquier
// ciudad -- la pantalla unificada administra todos los nodos por igual).
// ==============================================================
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const idCuenta = Number(id);
    await db.query(`DELETE FROM crm_cuentas_nodos WHERE id_cuenta = ?`, [idCuenta]);
    await db.query(`DELETE FROM crm_cuentas WHERE id = ?`, [idCuenta]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando cuenta:", error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
