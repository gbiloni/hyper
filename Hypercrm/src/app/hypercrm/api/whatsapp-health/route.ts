import { NextResponse } from 'next/server';
import { graphFetch, getAppId, classifyUsage } from '@/lib/metaGraph';

// Devuelve el uso actual de la Graph API del app (cabecera X-App-Usage),
// que es la misma señal que muestra el "Application Rate Limit" del
// App Dashboard de Meta. No hay endpoint público de histórico de llamadas
// ni de deprecaciones por app, así que este endpoint solo expone la foto
// del momento.
export async function GET() {
  const appId = getAppId();
  if (!appId) {
    return NextResponse.json({ success: false, error: 'Falta NEXT_PUBLIC_META_APP_ID en el servidor' }, { status: 500 });
  }

  const { ok, data, appUsage, status } = await graphFetch(`${appId}`, { fields: 'id,name' });

  if (!ok) {
    return NextResponse.json({ success: false, error: data?.error?.message || 'Error consultando el estado del app en Meta' }, { status });
  }

  const usage = appUsage || { call_count: 0, total_cputime: 0, total_time: 0 };
  const worst = Math.max(usage.call_count, usage.total_cputime, usage.total_time);

  return NextResponse.json({
    success: true,
    app: { id: data?.id, name: data?.name },
    usage,
    status: classifyUsage(worst),
    checked_at: new Date().toISOString(),
  });
}
