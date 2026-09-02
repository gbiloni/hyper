import { NextResponse } from 'next/server';
import api from '@/lib/api';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await Promise.resolve(params);
    const body = await req.json();

    const response = await api.put(`/usuarios/${id}`, body);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error updating usuario in API3:', error?.response?.data || error.message);
    return NextResponse.json(
      { success: false, error: error?.response?.data?.message || error.message || 'Error connecting to microservice' },
      { status: error?.response?.status || 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await Promise.resolve(params);

    const response = await api.delete(`/usuarios/${id}`);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error deleting usuario in API3:', error?.response?.data || error.message);
    return NextResponse.json(
      { success: false, error: error?.response?.data?.message || error.message || 'Error connecting to microservice' },
      { status: error?.response?.status || 500 }
    );
  }
}
