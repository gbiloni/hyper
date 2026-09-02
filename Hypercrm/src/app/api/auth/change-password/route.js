import pool from '@/lib/db';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

export async function PUT(req) {
  try {
    const { username, current_password, new_password } = await req.json();

    if (!username || !current_password || !new_password) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    if (new_password.length < 4) {
      return NextResponse.json({ error: 'La nueva clave debe tener al menos 4 caracteres' }, { status: 400 });
    }

    const [rows] = await pool.query(
      'SELECT id, password, activo FROM usuario WHERE username = ?',
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
    const md5Current = crypto.createHash('md5').update(current_password).digest('hex');
    
    const valid = dbPassword === current_password || dbPassword === md5Current;
    
    if (!valid) {
      return NextResponse.json({ error: 'La clave actual es incorrecta' }, { status: 401 });
    }

    const md5New = crypto.createHash('md5').update(new_password).digest('hex');

    // Intentamos actualizar password o clave según qué columna se use en la base de datos
    try {
      await pool.query(
        'UPDATE usuario SET password = ?, clave = ?, first_login = 0 WHERE id = ?',
        [md5New, md5New, user.id]
      );
    } catch (e) {
      // Si tira error porque alguna de las dos columnas no existe, hacemos update solo de la que seguro existe
      if (user.password !== undefined) {
        await pool.query('UPDATE usuario SET password = ?, first_login = 0 WHERE id = ?', [md5New, user.id]);
      } else {
        await pool.query('UPDATE usuario SET clave = ?, first_login = 0 WHERE id = ?', [md5New, user.id]);
      }
    }

    return NextResponse.json({ success: true, message: 'Clave actualizada correctamente' });
  } catch (err) {
    console.error('Error en change-password:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
