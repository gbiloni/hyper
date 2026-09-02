import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const endpoint = cookieStore.get("hyperisp_active_endpoint")?.value;
    const token = cookieStore.get("hyperisp_active_token")?.value;

    if (!endpoint) {
      return NextResponse.json({ success: false, error: 'No hay nodo activo seleccionado.' }, { status: 401 });
    }

    const apiUrl = decodeURIComponent(endpoint);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${decodeURIComponent(token)}`;

    const response = await fetch(`${apiUrl}/vehiculos`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    if (data && typeof data === 'object' && 'success' in data) {
      return NextResponse.json(data);
    }
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({ success: false, error: 'Error connecting to node' }, { status: 500 });
  }
}
