import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    // Reenviar el webhook directamente al puerto 8080 (Wildfly EAR)
    // El puerto 3000 de NextJS recibe en HTTPS y lo manda localmente al 8080.
    const url = 'http://localhost:8080/hypermgmt-rest/webhook/telegram';
    
    const javaRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });

    const resText = await javaRes.text();
    return NextResponse.json({ status: "forwarded", java: resText });
  } catch (error: any) {
    console.error('Error forwarding telegram webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
