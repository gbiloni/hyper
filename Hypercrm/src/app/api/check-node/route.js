import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { endpoints, token } = await req.json();

    if (!endpoints || !Array.isArray(endpoints) || endpoints.length === 0) {
      return NextResponse.json({ success: false, message: 'No endpoints provided' }, { status: 400 });
    }

    const logs = [];

    for (const ep of endpoints) {
      if (!ep) continue;
      
      try {
        logs.push(`[INTENTO] Probando: ${ep}/sistema/info`);
        console.log(`Checking connection to: ${ep}/sistema/info`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5 segundos de timeout
        
        const res = await fetch(`${ep}/sistema/info`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Si responde 200, 401 o 403, significa que el SERVIDOR Y LA API EXISTEN y responden.
        if (res.ok || res.status === 401 || res.status === 403) {
          logs.push(`[ÉXITO] Servidor respondió con estado ${res.status} en ${ep}`);
          console.log(`Success connecting to: ${ep}`);
          return NextResponse.json({ success: true, endpoint: ep, logs });
        } else {
          logs.push(`[FALLO] Servidor en ${ep} respondió con error ${res.status}`);
          console.log(`Failed connecting to: ${ep} - Status: ${res.status}`);
        }
      } catch (e) {
        logs.push(`[ERROR RED] Falló la conexión a ${ep} -> ${e.message}`);
        console.log(`Error connecting to: ${ep} - ${e.message}`);
        // Ignorar y probar el siguiente
      }
    }

    return NextResponse.json({ success: false, message: 'Ninguno de los endpoints respondió correctamente.', logs });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error interno del servidor.' }, { status: 500 });
  }
}
