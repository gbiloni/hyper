import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// En el modelo centralizado, guardamos la config del bot de Telegram
// de manera local en el CRM (un solo bot para todos los nodos).
const CONFIG_FILE = path.join(process.cwd(), 'telegram-config.json');

export async function GET() {
  try {
    let data = { telegramtoken: '', status: 'Desconectado' };
    try {
      const file = await fs.readFile(CONFIG_FILE, 'utf-8');
      data = JSON.parse(file);
    } catch (e) {
      // Archivo no existe, valores por defecto
    }
    
    // Si hay token, asumimos conectado (se podría validar llamando a la API de Telegram)
    if (data.telegramtoken) {
      data.status = 'Conectado';
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error GET telegram-config:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Guardar el token en el archivo local
    await fs.writeFile(CONFIG_FILE, JSON.stringify({
      telegramtoken: body.telegramtoken || ''
    }), 'utf-8');

    return NextResponse.json({ success: true, message: 'Guardado exitosamente' });
  } catch (error: any) {
    console.error('Error POST telegram-config:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
