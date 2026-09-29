import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { resolverIdNodo, ERROR_NODO } from '@/lib/cuentaNodo';

// Cada cuenta (número / bot) pertenece a UN solo nodo: crm_cuentas.id_nodo.
// Ver src/lib/cuentaNodo.ts.

// ==============================================================
// GET: Obtiene todas las cuentas configuradas, con el nombre del nodo al que
// pertenece cada una. El token NO se devuelve (solo si hay uno cargado): son
// credenciales de Meta/Telegram y no tienen por qué llegar al navegador.
// ==============================================================
export async function GET() {
  try {
    const [rows]: any = await db.query(
      `SELECT c.id, c.id_nodo, c.canal, c.identificador, c.waba_id, c.activo, c.fecha_creacion,
              (c.token IS NOT NULL AND c.token <> '') AS tiene_token,
              n.nombre AS nodo_nombre
       FROM crm_cuentas c
       LEFT JOIN nodo n ON n.id = c.id_nodo
       ORDER BY n.nombre ASC, c.id DESC`
    );
    return NextResponse.json(rows || []);
  } catch (error: any) {
    // Si la tabla no existe (ej. la primera vez), devolvemos array vacío
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json([]);
    }
    console.error("Error obteniendo cuentas:", error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// ==============================================================
// POST: Crea una nueva cuenta / número en un nodo
// ==============================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { canal, identificador, token, activo } = body;

    const idNodo = resolverIdNodo(body);
    if (!idNodo) {
      return NextResponse.json({ error: ERROR_NODO }, { status: 400 });
    }

    // Intentamos crear la tabla si no existe (estrategia de auto-migración simple)
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS crm_cuentas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_nodo INT NOT NULL,
        canal VARCHAR(50) NOT NULL,
        identificador VARCHAR(100) NOT NULL,
        token VARCHAR(255) NOT NULL,
        activo TINYINT(1) DEFAULT 1,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_nodo (id_nodo),
        UNIQUE KEY uq_identificador_canal (identificador, canal)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await db.query(createTableSql);

    await db.query(
      `INSERT INTO crm_cuentas (id_nodo, canal, identificador, token, activo)
       VALUES (?, ?, ?, ?, ?)`,
      [idNodo, canal, identificador, token, activo ? 1 : 0]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese identificador para ese canal.' }, { status: 409 });
    }
    console.error("Error creando cuenta:", error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
