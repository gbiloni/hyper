import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { resolverIdNodo, ERROR_NODO } from '@/lib/cuentaNodo';

// ==============================================================
// PUT: Edita una cuenta / número existente, incluido el nodo al que pertenece
// (cambiarlo "mueve" el número a otro nodo; sus conversaciones lo siguen
// cuando llega el próximo mensaje, ver el webhook).
// ==============================================================
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const idCuenta = Number(id);
    const body = await req.json();
    const { canal, identificador, token, activo } = body;

    const idNodo = resolverIdNodo(body);
    if (!idNodo) {
      return NextResponse.json({ error: ERROR_NODO }, { status: 400 });
    }

    // El formulario no recibe el token actual (GET no lo devuelve): si viene
    // vacío, se conserva el guardado; solo se reemplaza si escribieron uno.
    const tokenNuevo = typeof token === 'string' ? token.trim() : '';
    await db.query(
      `UPDATE crm_cuentas SET id_nodo = ?, canal = ?, identificador = ?, activo = ?${tokenNuevo ? ', token = ?' : ''}
       WHERE id = ?`,
      tokenNuevo
        ? [idNodo, canal, identificador, activo ? 1 : 0, tokenNuevo, idCuenta]
        : [idNodo, canal, identificador, activo ? 1 : 0, idCuenta]
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
// nodo -- la pantalla unificada administra todos los nodos por igual).
// ==============================================================
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const idCuenta = Number(id);
    await db.query(`DELETE FROM crm_cuentas WHERE id = ?`, [idCuenta]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando cuenta:", error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
