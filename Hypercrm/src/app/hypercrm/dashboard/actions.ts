"use server";

import { getApiConfig } from "@/lib/getApiConfig";

async function apiFetch(path: string) {
  const { apiUrl, token } = await getApiConfig();
  const res = await fetch(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Error ${res.status} en ${path}`);
  return res.json();
}

export async function getFtthStats() {
  try {
    const data = await apiFetch("/hardware/ftth/resumen");

    // Formatear datos para el componente visual
    const oltChartData = (data.olts || []).map((olt: any) => ({
      olt: olt.nombre || `OLT-${olt.id}`,
      online: olt.onuOnline || 0,
      offline: olt.onuOffline || 0,
      unknown: 0,
      total: (olt.onuOnline || 0) + (olt.onuOffline || 0)
    })).sort((a: any, b: any) => b.total - a.total);

    // Como el nuevo endpoint de resumen no devuelve PONs individuales (para hacerlo liviano),
    // podemos dejar topPons vacío o adaptarlo si luego agregamos esa data.
    const topPons: any[] = [];

    return {
      data: {
        totalOlts: data.totalOlts,
        totalShelves: data.totalShelves,
        totalPons: data.totalPons,
        totalOnus: data.totalOnus,
        onuOnline: data.onuOnline,
        onuOffline: data.onuOffline,
        onuUnknown: data.totalOnus - data.onuOnline - data.onuOffline,
        availability: data.availability,
        oltChartData,
        olts: data.olts || [],
        topPons,
        hasSignalData: false
      }
    };
  } catch (e: any) {
    return { error: e.message || "Error cargando estadísticas FTTH" };
  }
}

export async function getEocStats() {
  try {
    const data = await apiFetch("/hardware/eoc/resumen");
    return { data };
  } catch (e: any) {
    return { error: e.message || "Error cargando estadísticas EoC" };
  }
}

export async function getDocsisStats() {
  try {
    const data = await apiFetch("/hardware/docsis/resumen");
    return { data };
  } catch (e: any) {
    return { error: e.message || "Error cargando estadísticas DOCSIS" };
  }
}
