import db from '@/lib/db';
import { NextResponse } from 'next/server';

// crm_cuentas.id_nodo sigue existiendo y apuntando a la primera ciudad
// elegida (compatibilidad: el webhook y la bandeja de Soporte todavía
// resuelven la conversación contra un solo nodo). Esta tabla es la relación
// real N a N -- un número puede quedar vinculado a varias ciudades -- y es
// la fuente de verdad para el listado/edición en la pantalla de Números.
// El enrutamiento del webhook para números multi-ciudad queda pendiente
// como paso aparte.
async function ensureTablaCuentasNodos() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_cuentas_nodos (
      id_cuenta INT NOT NULL,
      id_nodo INT NOT NULL,
      PRIMARY KEY (id_cuenta, id_nodo),
      INDEX idx_nodo (id_nodo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

// ==============================================================
// GET: Obtiene todas las cuentas de WhatsApp/Telegram configuradas,
// con el listado de ciudades vinculadas a cada una.
// ==============================================================
export async function GET() {
  try {
    const [rows]: any = await db.query(`SELECT * FROM crm_cuentas ORDER BY id DESC`);
    if (!rows || rows.length === 0) return NextResponse.json([]);

    await ensureTablaCuentasNodos();

    // Backfill: cuentas creadas antes de que existiera esta tabla no tienen
    // fila en crm_cuentas_nodos todavía -- se completan con su id_nodo actual
    // para que no aparezcan "sin ciudad" en la pantalla.
    await db.query(
      `INSERT IGNORE INTO crm_cuentas_nodos (id_cuenta, id_nodo)
       SELECT id, id_nodo FROM crm_cuentas`
    );

    const [vinculos]: any = await db.query(
      `SELECT cn.id_cuenta, n.id, n.nombre
       FROM crm_cuentas_nodos cn
       JOIN nodo n ON n.id = cn.id_nodo
       ORDER BY n.nombre ASC`
    );

    const ciudadesPorCuenta = new Map<number, { id: number; nombre: string }[]>();
    for (const v of vinculos) {
      const lista = ciudadesPorCuenta.get(v.id_cuenta) || [];
      lista.push({ id: v.id, nombre: v.nombre });
      ciudadesPorCuenta.set(v.id_cuenta, lista);
    }

    const resultado = rows.map((c: any) => ({ ...c, ciudades: ciudadesPorCuenta.get(c.id) || [] }));
    return NextResponse.json(resultado);
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
// POST: Crea una nueva cuenta / número vinculado a una o más ciudades
// ==============================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_nodos, canal, identificador, token, activo } = body;

    // Orden ascendente por id, no el orden en que se tildaron los checkboxes
    // en el formulario: así "ciudad principal" (nodos[0], la que va en el
    // id_nodo de compatibilidad de abajo) es determinística y no depende de
    // en qué orden clickeó el admin.
    const nodos: number[] = (Array.isArray(id_nodos) ? id_nodos : [id_nodos].filter(Boolean)).slice().sort((a, b) => a - b);
    if (nodos.length === 0) {
      return NextResponse.json({ error: 'Elegí al menos una ciudad.' }, { status: 400 });
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
    await ensureTablaCuentasNodos();

    const [result]: any = await db.query(
      `INSERT INTO crm_cuentas (id_nodo, canal, identificador, token, activo)
       VALUES (?, ?, ?, ?, ?)`,
      [nodos[0], canal, identificador, token, activo ? 1 : 0]
    );
    const idCuenta = result.insertId;

    await db.query(
      `INSERT INTO crm_cuentas_nodos (id_cuenta, id_nodo) VALUES ${nodos.map(() => '(?, ?)').join(', ')}`,
      nodos.flatMap((idNodo) => [idCuenta, idNodo])
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
