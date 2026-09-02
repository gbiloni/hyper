import { NextResponse } from 'next/server';
import api from '@/lib/api';

export async function GET() {
  try {
    const response = await api.get('/roles');
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching roles from API3:', error?.response?.data || error.message);
    return NextResponse.json(
      { success: false, error: error?.response?.data?.message || error.message || 'Error connecting to microservice' },
      { status: error?.response?.status || 500 }
    );
  }
}
