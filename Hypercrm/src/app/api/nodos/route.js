import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

function getUser(req) {
  // Primero intentamos leer la cookie de sesión
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

  // Fallback a JWT
  const auth = req.headers.get('authorization');
  if(!auth) return null;
  try { return jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'hyperisp_blade_runner_2049_secret'); } catch { return null; }
}

export async function GET(req) {
  console.log("HIT NODOS API - GET /api/nodos");
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  
  try {
    if (user.rol === 'ADMIN') {
      const [rows] = await pool.query('SELECT * FROM nodo ORDER BY nombre ASC');
      return NextResponse.json(rows);
    } else {
      const [userRows] = await pool.query('SELECT nodos FROM usuario WHERE id = ?', [user.id]);
      if (userRows.length === 0) return NextResponse.json([]);
      
      let assignedNodos = [];
      try {
        const nodosRaw = userRows[0].nodos;
        if (typeof nodosRaw === 'string') assignedNodos = JSON.parse(nodosRaw);
        else if (Array.isArray(nodosRaw)) assignedNodos = nodosRaw;
      } catch(e) {}
      
      if (!assignedNodos || assignedNodos.length === 0) {
        return NextResponse.json([]);
      }
      
      const [rows] = await pool.query(`SELECT * FROM nodo WHERE id IN (?) ORDER BY nombre ASC`, [assignedNodos]);
      return NextResponse.json(rows);
    }
  } catch(e) { return NextResponse.json({error: 'Error'}, {status:500}); }
}

export async function POST(req) {
  const user = getUser(req);
  if(!user || user.rol !== 'ADMIN') return NextResponse.json({error: 'No autorizado'}, {status:403});
  try {
    const body = await req.json();
    await pool.query(
      'INSERT INTO nodo (nombre, endpoint, token, logo_url) VALUES (?, ?, ?, ?)',
      [body.nombre, body.endpoint, body.token, body.logo_url]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({error: 'Error interno'}, {status:500});
  }
}