import db from '@/lib/db';
import { NextResponse } from 'next/server';

// ==============================================================
// GET: Obtiene todas las cuentas de WhatsApp/Telegram configuradas
// ==============================================================
export async function GET() {
  try {
    // Left join con nodo para traer el nombre de la ciudad asociada
    const sql = `
      SELECT c.*, n.nombre as ciudad_nombre 
      FROM crm_cuentas c 
      LEFT JOIN nodo n ON c.id_nodo = n.id 
      ORDER BY c.id DESC
    `;
    const [rows] = await db.query(sql);
    return NextResponse.json(rows);
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
// POST: Crea una nueva cuenta / número vinculado a una ciudad
// ==============================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_nodo, canal, identificador, token, activo } = body;

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
        INDEX idx_nodo (id_nodo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await db.query(createTableSql);

    const sql = `
      INSERT INTO crm_cuentas (id_nodo, canal, identificador, token, activo) 
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.query(sql, [id_nodo, canal, identificador, token, activo ? 1 : 0]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creando cuenta:", error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
