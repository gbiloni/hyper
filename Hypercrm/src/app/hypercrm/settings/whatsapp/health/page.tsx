"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Newspaper, Rss } from "lucide-react";

interface HealthData {
  app: { id: string; name: string };
  usage: { call_count: number; total_cputime: number; total_time: number };
  status: "healthy" | "warning" | "critical" | "throttled";
  checked_at: string;
}

const STATUS_STYLE: Record<HealthData["status"], { color: string; label: string }> = {
  healthy: { color: "text-green-400 border-green-400/40 bg-green-400/10", label: "Saludable" },
  warning: { color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10", label: "Advertencia" },
  critical: { color: "text-orange-400 border-orange-400/40 bg-orange-400/10", label: "Crítico" },
  throttled: { color: "text-red-400 border-red-400/40 bg-red-400/10", label: "Limitado (throttled)" },
};

function UsageBar({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? "bg-red-400" : value >= 70 ? "bg-yellow-400" : "bg-[var(--primary)]";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[var(--text-muted)]">
        <span>{label}</span>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

export default function WhatsappHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-health");
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Error consultando el estado del app.");
        return;
      }
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Error de red.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/hypercrm/settings/whatsapp"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Números
          </Link>
          <h1 className="text-xl font-bold text-[var(--text-main)] tracking-wide flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--primary)]" />
            Estado de la API
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Uso actual de la Graph API del app HyperISP_WApp, tal como lo reporta Meta en cada respuesta.
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-[var(--primary)]/30 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
          title="Refrescar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {data && (
        <div className="bg-background-panel border border-[var(--primary)]/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-main)] font-semibold">{data.app.name || data.app.id}</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${STATUS_STYLE[data.status].color}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> {STATUS_STYLE[data.status].label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UsageBar label="Llamadas (call_count)" value={data.usage.call_count} />
            <UsageBar label="CPU (total_cputime)" value={data.usage.total_cputime} />
            <UsageBar label="Tiempo (total_time)" value={data.usage.total_time} />
          </div>

          <p className="text-[10px] text-[var(--text-muted)] font-mono">
            Última medición: {new Date(data.checked_at).toLocaleString()}
          </p>
        </div>
      )}

      <div className="bg-background-panel border border-[var(--primary)]/20 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[var(--primary)]" /> Novedades de WhatsApp Business Platform
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          Meta no expone por API pública el listado de deprecaciones próximas para un app puntual; el changelog oficial
          es la fuente confiable para eso.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 text-xs">
          <a
            href="https://developers.facebook.com/documentation/business-messaging/whatsapp/changelog"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
          >
            <Newspaper className="w-3.5 h-3.5" /> Ver changelog oficial
          </a>
          <a
            href="https://developers.facebook.com/documentation/business-messaging/whatsapp/changelog/rss/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
          >
            <Rss className="w-3.5 h-3.5" /> Suscribirse al RSS
          </a>
        </div>
      </div>
    </div>
  );
}
