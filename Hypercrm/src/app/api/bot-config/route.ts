import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Auto-crea la tabla si no existe al primer hit
async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_bot_config (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      id_nodo     INT NOT NULL,
      canal       VARCHAR(50) NOT NULL DEFAULT 'all',
      pregunta    VARCHAR(255) NOT NULL,
      respuesta   TEXT NOT NULL,
      tipo        VARCHAR(50) DEFAULT 'keyword',
      activo      TINYINT(1) DEFAULT 1,
      orden       INT DEFAULT 0,
      INDEX idx_nodo_canal (id_nodo, canal)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

// GET /api/bot-config?id_nodo=X&canal=whatsapp
export async function GET(req: Request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const idNodo = searchParams.get('id_nodo');
    const canal = searchParams.get('canal');

    let sql = 'SELECT * FROM crm_bot_config WHERE 1=1';
    const params: any[] = [];

    if (idNodo) { sql += ' AND id_nodo = ?'; params.push(idNodo); }
    if (canal && canal !== 'all') { sql += ' AND (canal = ? OR canal = "all")'; params.push(canal); }
    sql += ' ORDER BY orden ASC, id ASC';

    const [rows] = await db.query(sql, params);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('[BOT-CONFIG] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/bot-config — Crea nueva regla
export async function POST(req: Request) {
  try {
    await ensureTable();
    const { id_nodo, canal = 'all', pregunta, respuesta, tipo = 'keyword', orden = 0, activo = 1 } = await req.json();

    if (!id_nodo || !pregunta || !respuesta) {
      return NextResponse.json({ error: 'id_nodo, pregunta y respuesta son requeridos' }, { status: 400 });
    }

    if (tipo === 'interactive_button' || tipo === 'interactive_list') {
      try {
        JSON.parse(respuesta);
      } catch (e) {
        return NextResponse.json({ error: 'La respuesta debe ser un JSON válido para botones/listas interactivas' }, { status: 400 });
      }
    }

    const [result]: any = await db.query(
      'INSERT INTO crm_bot_config (id_nodo, canal, pregunta, respuesta, tipo, orden, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id_nodo, canal, pregunta, respuesta, tipo, orden, activo ? 1 : 0]
    );
    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error: any) {
    console.error('[BOT-CONFIG] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
