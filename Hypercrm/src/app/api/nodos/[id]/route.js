import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

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

export async function PUT(req, { params }) {
  const user = getUser(req);
  if(!user || user.rol !== 'ADMIN') return NextResponse.json({error: 'No autorizado'}, {status:403});
  try {
    const { id } = await params;
    const body = await req.json();
    await pool.query(
      'UPDATE nodo SET nombre=?, endpoint=?, token=?, logo_url=? WHERE id=?',
      [body.nombre, body.endpoint, body.token, body.logo_url, id]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({error: 'Error interno'}, {status:500});
  }
}

export async function DELETE(req, { params }) {
  const user = getUser(req);
  if(!user || user.rol !== 'ADMIN') return NextResponse.json({error: 'No autorizado'}, {status:403});
  try {
    const { id } = await params;
    await pool.query('DELETE FROM nodo WHERE id=?', [id]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({error: 'Error interno'}, {status:500});
  }
}
