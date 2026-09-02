import pool from '@/lib/db';
import { NextResponse } from 'next/server';
export async function GET() {
  try {
    const [rows] = await pool.query('SELECT id, nombre, logo_url FROM nodo WHERE activo = 1 ORDER BY nombre');
    return NextResponse.json(rows);
  } catch (err) { return NextResponse.json({ error: 'Error del servidor' }, { status: 500 }); }
}