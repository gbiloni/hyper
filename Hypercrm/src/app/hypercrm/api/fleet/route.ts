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

function normalizeFleetList(rawList: any[]) {
  return rawList.map((item: any) => ({
    id: item.id ?? item.sys_id ?? item.ID ?? item.Id ?? "N/A",
    telefono: item.telefono || "",
    dominio: item.dominio || "",
    latitud: item.latitud !== undefined ? item.latitud : (item.lat || 0),
    longitud: item.longitud !== undefined ? item.longitud : (item.lng || 0),
    velocidad: item.velocidad || 0,
    curso: item.curso || "",
    ult_transmision: item.ult_transmision || item.fecha_gps || null,
    activo: item.activo === 1 || item.activo === true || item.activo === "1" || item.status === "active" ? 1 : 0,
    es_vehiculo: item.es_vehiculo !== undefined ? (item.es_vehiculo === 1 || item.es_vehiculo === true ? 1 : 0) : 1
  }));
}

export async function GET() {
  try {
    const { apiUrl, headers } = await getConfig();

    const response = await fetch(`${apiUrl}/vehiculos/fleet`, { method: 'GET', headers, cache: 'no-store' });

    if (!response.ok) {
      console.warn(`[fleet] /vehiculos/fleet devolvió ${response.status}. Intentando fallback a /vehiculos`);
      const fallbackResponse = await fetch(`${apiUrl}/vehiculos`, { method: 'GET', headers, cache: 'no-store' });
      if (!fallbackResponse.ok) throw new Error(`Error HTTP en fallback: ${fallbackResponse.status}`);
      const fallbackData = await fallbackResponse.json();
      const rawList = Array.isArray(fallbackData?.data) ? fallbackData.data : (Array.isArray(fallbackData) ? fallbackData : []);
      return NextResponse.json({ success: true, data: normalizeFleetList(rawList) });
    }

    const data = await response.json();
    const rawList = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    return NextResponse.json({ success: true, data: normalizeFleetList(rawList) });

  } catch (error: any) {
    console.error('Error fetching fleet:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Microservice error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apiUrl, headers } = await getConfig();

    const response = await fetch(`${apiUrl}/vehiculos/fleet`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Microservice error' }, { status: 500 });
  }
}
