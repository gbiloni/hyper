import { NextResponse } from 'next/server';
import api from '@/lib/api';

export async function GET() {
  try {
    const response = await api.get('/usuarios');
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching usuarios from API3:', error?.response?.data || error.message);
    return NextResponse.json(
      { success: false, error: error?.response?.data?.message || error.message || 'Error connecting to microservice' },
      { status: error?.response?.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const response = await api.post('/usuarios', body);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error creating usuario in API3:', error?.response?.data || error.message);
    return NextResponse.json(
      { success: false, error: error?.response?.data?.message || error.message || 'Error connecting to microservice' },
      { status: error?.response?.status || 500 }
    );
  }
}
