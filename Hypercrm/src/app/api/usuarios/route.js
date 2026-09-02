import pool from '@/lib/db';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

function getUser(req) {
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => {
      const [key, ...v] = c.split('=');
      return [key, decodeURIComponent(v.join('='))];
    }));
    if (cookies.hyperisp_session) {
      try {
        const sessionUser = JSON.parse(cookies.hyperisp_session);
        if (sessionUser.es_admin || (sessionUser.rol && String(sessionUser.rol).toUpperCase() === 'ADMINISTRADOR')) {
          sessionUser.rol = 'ADMIN';
        }
        return sessionUser;
      } catch(e) {}
    }
  }
  const auth = req.headers.get('authorization');
  if(!auth) return null;
  try { return jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'hyperisp_blade_runner_2049_secret'); } catch { return null; }
}

export async function GET(req) {
  const user = getUser(req);
  if(!user || user.rol !== 'ADMIN') return NextResponse.json({error: 'No autorizado'}, {status:403});
  try {
    let rows;
    try {
      [rows] = await pool.query('SELECT id, username, nombre, email, rol, activo, nodos FROM usuario ORDER BY id DESC');
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR' || err.message.includes('Unknown column')) {
        console.log("Column 'nodos' not found, creating it automatically...");
        await pool.query('ALTER TABLE usuario ADD COLUMN nodos TEXT');
        [rows] = await pool.query('SELECT id, username, nombre, email, rol, activo, nodos FROM usuario ORDER BY id DESC');
      } else {
        throw err;
      }
    }

    const parsedRows = rows.map(r => {
      let parsedNodos = [];
      try {
        if (typeof r.nodos === 'string') parsedNodos = JSON.parse(r.nodos);
        else if (Array.isArray(r.nodos)) parsedNodos = r.nodos;
      } catch(e) {}
      return { ...r, nodos: parsedNodos };
    });
    return NextResponse.json(parsedRows);
  } catch(e) { 
    console.error("GET USUARIOS ERROR:", e);
    return NextResponse.json({error: e.message || 'Error'}, {status:500}); 
  }
}

export async function POST(req) {
  const user = getUser(req);
  if(!user || user.rol !== 'ADMIN') return NextResponse.json({error: 'No autorizado'}, {status:403});
  try {
    const body = await req.json();
    const md5Pass = crypto.createHash('md5').update(body.password).digest('hex');
    const nodosJson = JSON.stringify(body.nodos || []);
    await pool.query('INSERT INTO usuario (username, password, nombre, email, rol, activo, nodos) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [body.username, md5Pass, body.nombre, body.email, body.rol, body.activo ? 1 : 0, nodosJson]);
    return NextResponse.json({success: true});
  } catch(e) { return NextResponse.json({error: 'Error'}, {status:500}); }
}
