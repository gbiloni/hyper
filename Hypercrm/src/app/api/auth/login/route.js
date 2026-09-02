import pool from '@/lib/db';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'hyperisp_blade_runner_2049_secret';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña son obligatorios' }, { status: 400 });
    }

    const [rows] = await pool.query(
      'SELECT id, username, password, nombre, email, rol, activo, first_login FROM usuario WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const user = rows[0];
    if (!user.activo) {
      return NextResponse.json({ error: 'Usuario desactivado' }, { status: 403 });
    }

    const dbPassword = user.password || user.clave;
    const md5Password = crypto.createHash('md5').update(password).digest('hex');
    
    // Acepta MD5 (estándar) o texto plano (compatibilidad con cuentas antiguas)
    // En cuanto el usuario cambie su clave, quedará en MD5
    const valid = dbPassword === md5Password || dbPassword === password;
    
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const isFirstLogin = user.first_login === 1 || user.first_login === true || user.first_login === null;

    const token = jwt.sign(
      { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol, first_login: isFirstLogin },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Get IP if possible, fallback to unknown
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    // Log del login
    await pool.query(
      'INSERT INTO log_actividad (usuario_id, accion, entidad, detalle) VALUES (?, ?, ?, ?)',
      [user.id, 'LOGIN', 'usuario', JSON.stringify({ ip })]
    );

    const response = NextResponse.json({
      token,
      user: { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol, first_login: isFirstLogin }
    });

    const sessionData = JSON.stringify({
      id: user.id,
      nombre: user.nombre,
      es_admin: user.rol === 'ADMIN' || (user.rol && String(user.rol).toUpperCase() === 'ADMINISTRADOR'),
      first_login: isFirstLogin,
      username: user.username,
      roles: []
    });

    response.cookies.set({
      name: "hyperisp_session",
      value: sessionData,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 1 día
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    console.error('Error en login:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
