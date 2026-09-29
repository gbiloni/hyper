import db from '@/lib/db';

// Compartido por manual/, exchange/ y sync/: las tres formas de dar de alta
// un número de WhatsApp ahora eligen explícitamente a qué ciudades queda
// vinculado (antes usaban siempre el nodo activo de la cookie nada más).

// Si el cliente no mandó id_nodos (llamada vieja, o algo falló en el
// formulario), cae al nodo activo de la cookie -- mismo comportamiento que
// había antes de esta función existir.
export function resolverIdNodos(idNodosBody: unknown, idNodoCookie: string | undefined): number[] {
  const nodos = Array.isArray(idNodosBody) ? idNodosBody.filter(Boolean) : [];
  if (nodos.length > 0) return nodos;
  return [idNodoCookie ? parseInt(idNodoCookie, 10) : 1];
}

// Reemplaza el set de ciudades vinculadas a una cuenta (identificador+canal)
// en crm_cuentas_nodos. No usa el insertId del INSERT ... ON DUPLICATE KEY
// UPDATE de arriba porque con ese driver no es confiable cuando el UPDATE no
// toca la columna autoincremental -- se busca el id real después.
export async function vincularCiudades(canal: string, identificador: string, idNodos: number[]) {
  const [rows]: any = await db.query(
    `SELECT id FROM crm_cuentas WHERE canal = ? AND identificador = ? LIMIT 1`,
    [canal, identificador]
  );
  const idCuenta = rows?.[0]?.id;
  if (!idCuenta) return;

  await db.query(`DELETE FROM crm_cuentas_nodos WHERE id_cuenta = ?`, [idCuenta]);
  await db.query(
    `INSERT INTO crm_cuentas_nodos (id_cuenta, id_nodo) VALUES ${idNodos.map(() => '(?, ?)').join(', ')}`,
    idNodos.flatMap((idNodo) => [idCuenta, idNodo])
  );
}
