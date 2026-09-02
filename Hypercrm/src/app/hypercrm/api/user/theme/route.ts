import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("hyperisp_session");
    
    if (!session || !session.value) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    try {
      const data = JSON.parse(session.value);
      userId = data.id;
    } catch {
      userId = session.value;
    }

    // Por el momento se devuelve un success genérico si no se guardan
    // todavía en una tabla dedicada del CRM
    return NextResponse.json({ success: true, tema: null });
  } catch (error: any) {
    console.error('Error fetching user theme:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("hyperisp_session");
    
    if (!session || !session.value) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // En un futuro se guarda el JSON stringified en la tabla de usuarios local
    // const body = await req.json();
    // const [result] = await pool.query('UPDATE usuario SET tema = ? WHERE id = ?', [JSON.stringify(body), userId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving user theme:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno' },
      { status: 500 }
    );
  }
}
