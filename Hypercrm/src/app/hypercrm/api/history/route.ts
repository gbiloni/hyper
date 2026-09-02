import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getConfig() {
  const cookieStore = await cookies();
  const endpoint = cookieStore.get("hyperisp_active_endpoint")?.value;
  const token = cookieStore.get("hyperisp_active_token")?.value;
  if (!endpoint) throw new Error("No hay nodo activo seleccionado.");
  const apiUrl = decodeURIComponent(endpoint);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${decodeURIComponent(token)}`;
  return { apiUrl, headers };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!vehicleId || !from || !to) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros: vehicleId, from, to' }, { status: 400 });
    }

    const { apiUrl, headers } = await getConfig();

    const apiParams = new URLSearchParams();
    apiParams.append("vehicleId", vehicleId);
    apiParams.append("from", from);
    apiParams.append("to", to);

    const response = await fetch(`${apiUrl}/vehiculos/history?${apiParams.toString()}`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

    const data = await response.json();
    if (data && typeof data === 'object' && 'success' in data) return NextResponse.json(data);
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error fetching vehicle history:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error interno' }, { status: 500 });
  }
}
