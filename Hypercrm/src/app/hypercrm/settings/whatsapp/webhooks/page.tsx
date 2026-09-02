"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Webhook, ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle, Save, Trash2, Info } from "lucide-react";

interface SubscriptionState {
  fields: string[];
  active: boolean;
  callback_url: string;
}

export default function WhatsappWebhooksPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-webhooks/subscriptions");
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Error consultando la suscripción.");
        return;
      }
      setSubscription(data.subscription);
      setAvailableFields(data.available_fields || []);
      setSelected(new Set(data.subscription?.fields || []));
    } catch (e: any) {
      setError(e?.message || "Error de red.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleField = (field: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const handleGuardar = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-webhooks/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Error guardando la suscripción.");
      } else {
        setSuccessMsg(data.message || "Suscripción guardada.");
        await load();
      }
    } catch (e: any) {
      setError(e?.message || "Error de red.");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirm("¿Eliminar la suscripción de webhooks del app? Vas a dejar de recibir mensajes y estados de WhatsApp.")) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-webhooks/subscriptions", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Error eliminando la suscripción.");
      } else {
        setSuccessMsg(data.message || "Suscripción eliminada.");
        setSelected(new Set());
        await load();
      }
    } catch (e: any) {
      setError(e?.message || "Error de red.");
    } finally {
      setSaving(false);
    }
  };

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
            <Webhook className="w-5 h-5 text-[var(--primary)]" />
            Webhooks del App
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Elegí qué eventos de WhatsApp le llegan a este servidor. Se aplica a nivel del app de Meta, no por número.
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

      <div className="bg-background-panel border border-[var(--primary)]/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-2 text-xs text-[var(--text-muted)] bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-lg p-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-[var(--primary)]" />
          <span>
            No existe un endpoint público de Meta para "enviar un webhook de prueba" — esa función solo está en el App
            Dashboard. Para probar, mandá un mensaje real al número conectado y revisá los logs del servidor.
          </span>
        </div>

        {subscription && (
          <div className="text-xs text-[var(--text-muted)] font-mono space-y-1">
            <div>
              Callback: <span className="text-[var(--text-main)]">{subscription.callback_url || "—"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              Estado:
              {subscription.active ? (
                <span className="inline-flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3.5 h-3.5" /> Activa</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-yellow-400"><AlertTriangle className="w-3.5 h-3.5" /> Inactiva</span>
              )}
            </div>
          </div>
        )}

        {!loading && subscription && subscription.fields.length === 0 && (
          <p className="text-xs text-yellow-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            La suscripción está activa pero sin campos elegidos: no está llegando ningún evento todavía.
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {availableFields.map((field) => (
            <label
              key={field}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                selected.has(field)
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--primary)]/20 text-[var(--text-muted)] hover:border-[var(--primary)]/40"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(field)}
                onChange={() => toggleField(field)}
                className="accent-[var(--primary)]"
              />
              {field}
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleGuardar}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)] text-[var(--primary)] font-semibold text-sm hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar suscripción"}
          </button>
          <button
            onClick={handleEliminar}
            disabled={saving || loading || !subscription}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/40 text-red-400 font-semibold text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar suscripción
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1 mt-2">
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </p>
        )}
        {successMsg && (
          <p className="text-xs text-green-400 flex items-center gap-1 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> {successMsg}
          </p>
        )}
      </div>
    </div>
  );
}
