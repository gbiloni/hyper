import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hyperisp_blade_runner_2049_secret';

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
        return sessionUser;
      } catch(e) {}
    }
  }

  const auth = req.headers.get('authorization');
  if(!auth) return null;
  try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return null; }
}

export async function GET(req) {
  const user = getUser(req);
  if (!user || (!user.id && !user.username)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  
  // Usamos el username como clave principal porque el ID puede variar entre la base 'hyper' y la base del nodo (API3)
  const lookupField = user.username ? 'username' : 'id';
  const lookupValue = user.username || user.id;

  try {
    const [rows] = await pool.query(`SELECT tema FROM usuario WHERE ${lookupField} = ?`, [lookupValue]);
    if (rows.length === 0) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    
    let tema = null;
    if (rows[0].tema) {
      try {
        tema = typeof rows[0].tema === 'string' ? JSON.parse(rows[0].tema) : rows[0].tema;
      } catch(e) {
        console.error("Error parsing theme from DB:", e);
      }
    }
    
    return NextResponse.json({ success: true, tema });
  } catch (err) {
    console.error('Error fetching theme:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(req) {
  const user = getUser(req);
  if (!user || (!user.id && !user.username)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  
  const lookupField = user.username ? 'username' : 'id';
  const lookupValue = user.username || user.id;

  try {
    const body = await req.json();
    const temaString = JSON.stringify(body);
    
    await pool.query(`UPDATE usuario SET tema = ? WHERE ${lookupField} = ?`, [temaString, lookupValue]);
    
    return NextResponse.json({ success: true, message: 'Tema actualizado' });
  } catch (err) {
    console.error('Error updating theme:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
