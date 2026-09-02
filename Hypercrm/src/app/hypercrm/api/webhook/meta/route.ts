import { NextResponse } from 'next/server';

const JAVA_URL = 'http://localhost:8080/hypermgmt-rest/webhook/meta';

// GET para el handshake de verificación inicial de Meta
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = queryString ? `${JAVA_URL}?${queryString}` : JAVA_URL;

    const javaRes = await fetch(url, {
      method: 'GET',
    });

    const resText = await javaRes.text();
    
    // Meta espera la respuesta cruda del challenge, no un JSON.
    return new NextResponse(resText, {
      status: javaRes.status,
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error: any) {
    console.error('Error forwarding Meta GET webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST para recibir los eventos reales (Mensajes, Lecturas, etc)
export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-hub-signature-256') || '';
    const body = await request.text();
    
    const javaRes = await fetch(JAVA_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature
      },
      body: body
    });

    const resText = await javaRes.text();
    return NextResponse.json({ status: "forwarded", java: resText });
  } catch (error: any) {
    console.error('Error forwarding Meta POST webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
