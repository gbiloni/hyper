"use client";

import { useEffect, useState } from "react";
import { Send, Save, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

export default function TelegramSettingsPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("Cargando...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/hypercrm/api/telegram-config");
      if (res.ok) {
        const data = await res.json();
        setToken(data.telegramtoken || "");
        setStatus(data.status || "Desconectado");
      }
    } catch (e) {
      console.error(e);
      setStatus("Error de red");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/hypercrm/api/telegram-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramtoken: token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ text: data.message || "Guardado exitosamente", type: "success" });
        loadConfig();
      } else {
        setMessage({ text: data.error || "Error al guardar", type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: "Error de red al guardar la configuración.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] tracking-wide flex items-center gap-2">
            <Send className="w-5 h-5 text-sky-400" />
            Integración de Telegram
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Conectá un Bot de Telegram para recibir y responder mensajes desde la bandeja omnicanal.
          </p>
        </div>
        <button
          onClick={loadConfig}
          className="p-2 rounded-lg border border-sky-500/30 text-[var(--text-muted)] hover:text-sky-400 transition-colors"
          title="Refrescar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-background-panel border border-sky-500/20 rounded-2xl p-6 space-y-5 max-w-2xl">
        
        <div className="flex items-center justify-between p-4 bg-black/40 border border-gray-800 rounded-xl">
          <div>
            <h3 className="text-sm font-semibold text-white">Estado de la conexión</h3>
            <p className="text-xs text-gray-500 mt-1">Verifica si el Webhook está correctamente enlazado a HyperCRM.</p>
          </div>
          <div className="flex items-center gap-2">
            {status === "Conectado" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-950/60 text-green-400 border border-green-500/30 rounded-full text-xs font-mono font-bold tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" /> CONECTADO
              </span>
            ) : status === "Cargando..." ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-900/60 text-gray-400 border border-gray-700/30 rounded-full text-xs font-mono tracking-wider">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> VERIFICANDO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-950/60 text-red-400 border border-red-500/30 rounded-full text-xs font-mono font-bold tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" /> {status.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--text-main)] uppercase tracking-widest block">
            Telegram Bot Token
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Lo obtenés creando un bot en Telegram con <b>@BotFather</b> (ej: <code>123456789:ABCdefGHIjklMNOpqrsTUVwxyz</code>).
          </p>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Pegá tu token de Telegram acá..."
            className="w-full bg-black/50 border border-sky-900/50 rounded-lg px-4 py-3 text-sm text-sky-100 font-mono focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="flex-1">
            {message && (
              <p className={`text-xs flex items-center gap-1.5 ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
                {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {message.text}
              </p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-sky-600/20 border border-sky-500 text-sky-400 font-bold tracking-widest text-xs hover:bg-sky-500 hover:text-black transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "GUARDANDO..." : "GUARDAR Y CONECTAR"}
          </button>
        </div>

      </div>
    </div>
  );
}
