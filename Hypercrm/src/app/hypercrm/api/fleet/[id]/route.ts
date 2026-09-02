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

export async function PUT(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { apiUrl, headers } = await getConfig();

    const response = await fetch(`${apiUrl}/vehiculos/fleet/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Microservice error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const { apiUrl, headers } = await getConfig();

    const response = await fetch(`${apiUrl}/vehiculos/fleet/${id}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Microservice error' }, { status: 500 });
  }
}
