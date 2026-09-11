"use client";

import { Fragment, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { MessageCircle, Plus, Trash2, RefreshCw, CheckCircle2, AlertTriangle, Clock, Download, Settings, Server, FileText, Webhook, Activity, Phone, ChevronDown, ChevronUp } from "lucide-react";

interface WhatsappConfigRow {
  id: number;
  area: string;
  numero: string | null;
  waba_id: string | null;
  phone_number_id: string | null;
  estado: "ACTIVO" | "PENDIENTE" | "ERROR";
  coexistence: 0 | 1;
  created_at: string;
}

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID;

export default function WhatsappSettingsPage() {
  const [rows, setRows] = useState<WhatsappConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<"oauth" | "sync" | "manual">("manual");
  
  // Campos
  const [area, setArea] = useState("");
  const [manualPhoneId, setManualPhoneId] = useState("");
  const [manualToken, setManualToken] = useState("");
  
  const [syncWabaId, setSyncWabaId] = useState("");
  const [syncToken, setSyncToken] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const signupDataRef = useRef<{ waba_id?: string; phone_number_id?: string; coexistence?: boolean }>({});

  // Calling/SIP settings (solo lectura) por fila, para no tener que hacer
  // curl a mano contra Meta Graph API cuando hay que diagnosticar el trunk.
  const [callingOpenId, setCallingOpenId] = useState<number | null>(null);
  const [callingLoading, setCallingLoading] = useState(false);
  const [callingData, setCallingData] = useState<any>(null);
  const [callingError, setCallingError] = useState<string | null>(null);

  async function handleVerCalling(id: number) {
    if (callingOpenId === id) {
      setCallingOpenId(null);
      return;
    }
    setCallingOpenId(id);
    setCallingData(null);
    setCallingError(null);
    setCallingLoading(true);
    try {
      const res = await fetch(`/hypercrm/api/whatsapp-config/${id}/calling`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error consultando Calling settings.");
      setCallingData(data.calling || data);
    } catch (e: any) {
      setCallingError(e.message);
    } finally {
      setCallingLoading(false);
    }
  }

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-config");
      if (res.ok) setRows(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // Carga el SDK de JS de Facebook
  useEffect(() => {
    if (!META_APP_ID || document.getElementById("facebook-jssdk")) return;

    window.fbAsyncInit = function () {
      window.FB?.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v26.0",
        cookie: true,
      });
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/es_LA/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP" && data.event === "FINISH") {
          signupDataRef.current = {
            waba_id: data.data?.waba_id,
            phone_number_id: data.data?.phone_number_id,
            coexistence: !!data.data?.current_step && data.data?.current_step !== "SUBMIT",
          };
        }
      } catch (e) {}
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleConectarOAuth = () => {
    setError(null);
    setSuccessMsg(null);

    if (!area.trim()) {
      setError("Ingresá un nombre de área (ej. Ventas, Soporte).");
      return;
    }
    if (!META_APP_ID || !META_CONFIG_ID) {
      setError("Falta configurar NEXT_PUBLIC_META_APP_ID / NEXT_PUBLIC_META_CONFIG_ID en .env.");
      return;
    }
    if (!window.FB) {
      setError("El SDK de Facebook todavía no cargó. Esperá un segundo.");
      return;
    }

    signupDataRef.current = {};
    setConnecting(true);

    window.FB.login(
      (response: any) => {
        const code: string | undefined = response?.authResponse?.code;
        if (!code) {
          setError(`No se recibió el código de Meta.`);
          setConnecting(false);
          return;
        }

        const { waba_id, phone_number_id, coexistence } = signupDataRef.current;
        if (!waba_id || !phone_number_id) {
          setError("No se recibieron los datos de la cuenta desde Meta.");
          setConnecting(false);
          return;
        }

        (async () => {
          try {
            const res = await fetch("/hypercrm/api/whatsapp-config/exchange", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code, area: area.trim(), waba_id, phone_number_id, coexistence }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
              setError(data.error || "Error vinculando la cuenta.");
            } else {
              setSuccessMsg("¡Número vinculado exitosamente!");
              setArea("");
            }
            await loadRows();
          } catch (e: any) {
            setError(e?.message || "Error de red.");
          } finally {
            setConnecting(false);
          }
        })();
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      }
    );
  };

  const handleAltaManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!manualPhoneId.trim()) {
      setError("Ingresá el Phone Number ID o Número de teléfono.");
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-config/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number_id: manualPhoneId.trim(), token: manualToken.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(data.message || "Número agregado correctamente.");
        setManualPhoneId("");
        setManualToken("");
        await loadRows();
      } else {
        setError(data.error || "Error guardando el número.");
      }
    } catch (err: any) {
      setError("Error al conectar con la API.");
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!syncWabaId.trim() || !syncToken.trim()) {
      setError("Ingresá el WABA ID y el Access Token de Meta.");
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-config/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waba_id: syncWabaId.trim(), access_token: syncToken.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(data.message || "Números sincronizados con Meta.");
        setSyncWabaId("");
        setSyncToken("");
        await loadRows();
      } else {
        setError(data.error || "Error sincronizando con Meta.");
      }
    } catch (err: any) {
      setError("Error al conectar con Meta.");
    } finally {
      setConnecting(false);
    }
  };

  // Sincroniza usando el WABA ID + token que ya quedaron guardados de una
  // cuenta conectada antes (Alta Manual o Asistente de Meta) — no requiere
  // pegar ningún dato a mano.
  const handleSyncAuto = async () => {
    setError(null);
    setSuccessMsg(null);
    setConnecting(true);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-config/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(data.message || "Sincronización automática completada.");
        await loadRows();
      } else {
        setError(data.error || "Error en la sincronización automática.");
      }
    } catch (err: any) {
      setError("Error al conectar con Meta.");
    } finally {
      setConnecting(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Desconectar este número?")) return;
    try {
      await fetch(`/hypercrm/api/whatsapp-config/${id}`, { method: "DELETE" });
      await loadRows();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] tracking-wide flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[var(--primary)]" />
            Números de WhatsApp
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Gestioná y conectá las credenciales de WhatsApp Business directamente en la base de datos local `crm_cuentas`.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/hypercrm/settings/whatsapp/templates"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--primary)]/30 text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors text-sm"
          >
            <FileText className="w-4 h-4" /> Plantillas
          </Link>
          <Link
            href="/hypercrm/settings/whatsapp/webhooks"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--primary)]/30 text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors text-sm"
          >
            <Webhook className="w-4 h-4" /> Webhooks
          </Link>
          <Link
            href="/hypercrm/settings/whatsapp/health"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--primary)]/30 text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors text-sm"
          >
            <Activity className="w-4 h-4" /> Estado API
          </Link>
          <button
            onClick={loadRows}
            className="p-2 rounded-lg border border-[var(--primary)]/30 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* TABS DE METODOS */}
      <div className="bg-background-panel border border-[var(--primary)]/20 rounded-2xl p-5 space-y-4">
        <div className="flex border-b border-[var(--primary)]/20 gap-4 text-xs font-semibold uppercase tracking-wider">
          <button
            onClick={() => { setActiveTab("manual"); setError(null); setSuccessMsg(null); }}
            className={`pb-2 transition-colors flex items-center gap-1.5 ${activeTab === "manual" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
          >
            <Server className="w-4 h-4" /> Alta Manual (Rápida)
          </button>
          <button
            onClick={() => { setActiveTab("sync"); setError(null); setSuccessMsg(null); }}
            className={`pb-2 transition-colors flex items-center gap-1.5 ${activeTab === "sync" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
          >
            <Download className="w-4 h-4" /> Leer de Meta (Auto-Sync)
          </button>
          <button
            onClick={() => { setActiveTab("oauth"); setError(null); setSuccessMsg(null); }}
            className={`pb-2 transition-colors flex items-center gap-1.5 ${activeTab === "oauth" ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
          >
            <Settings className="w-4 h-4" /> Asistente de Meta (FB Login)
          </button>
        </div>

        {/* TAB 1: ALTA MANUAL */}
        {activeTab === "manual" && (
          <form onSubmit={handleAltaManual} className="space-y-3 pt-2">
            <p className="text-xs text-[var(--text-muted)]">
              Agregá o actualizá un número ingresando directamente su Phone Number ID o número telefónico.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={manualPhoneId}
                onChange={(e) => setManualPhoneId(e.target.value)}
                placeholder="Phone Number ID / Número (ej: 92235373037)"
                className="bg-background border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                required
              />
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Meta Access Token (Opcional)"
                className="bg-background border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <button
              type="submit"
              disabled={connecting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)] text-[var(--primary)] font-semibold text-sm hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {connecting ? "Guardando..." : "Guardar en crm_cuentas"}
            </button>
          </form>
        )}

        {/* TAB 2: AUTOSYNC DE META */}
        {activeTab === "sync" && (
          <form onSubmit={handleSyncMeta} className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-[var(--text-muted)]">
                Ingresá tu WABA ID y tu Token de Meta para obtener e importar automáticamente todos los números registrados.
              </p>
              <button
                type="button"
                onClick={handleSyncAuto}
                disabled={connecting}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--primary)]/40 text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50 whitespace-nowrap"
                title="Usa el WABA ID y token de una cuenta ya conectada, sin pedirte nada"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${connecting ? "animate-spin" : ""}`} />
                Sincronizar automáticamente
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={syncWabaId}
                onChange={(e) => setSyncWabaId(e.target.value)}
                placeholder="WABA ID (WhatsApp Business Account ID)"
                className="bg-background border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                required
              />
              <input
                type="text"
                value={syncToken}
                onChange={(e) => setSyncToken(e.target.value)}
                placeholder="Meta Access Token"
                className="bg-background border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={connecting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)] text-[var(--primary)] font-semibold text-sm hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {connecting ? "Sincronizando..." : "Sincronizar Números desde Meta"}
            </button>
          </form>
        )}

        {/* TAB 3: OAUTH POPUP */}
        {activeTab === "oauth" && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-[var(--text-muted)]">
              Usa el asistente emergente oficial de Meta para registrar una línea nueva.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Área (ej. Ventas, Soporte)"
                className="flex-1 bg-background border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
              <button
                type="button"
                onClick={handleConectarOAuth}
                disabled={connecting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)] text-[var(--primary)] font-semibold text-sm hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {connecting ? "Conectando..." : "Abrir Asistente de Meta"}
              </button>
            </div>
          </div>
        )}

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

      {/* TABLA DE NUMEROS */}
      <div className="bg-background-panel border border-[var(--primary)]/20 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--primary)]/20 text-[var(--text-muted)] text-xs uppercase tracking-wider">
              <th className="text-left p-3">Área</th>
              <th className="text-left p-3">Número / Phone ID</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Convivencia</th>
              <th className="text-left p-3">Conectado</th>
              <th className="text-right p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center p-6 text-[var(--text-muted)] text-sm">
                  Todavía no hay números conectados en este nodo.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <Fragment key={r.id}>
              <tr className="border-b border-[var(--primary)]/10 hover:bg-white/[0.02]">
                <td className="p-3 text-[var(--text-main)]">{r.area}</td>
                <td className="p-3 text-[var(--text-muted)] font-mono">{r.numero || r.phone_number_id || "—"}</td>
                <td className="p-3">
                  {r.estado === "ACTIVO" && (
                    <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                    </span>
                  )}
                  {r.estado === "PENDIENTE" && (
                    <span className="inline-flex items-center gap-1 text-yellow-400 text-xs">
                      <Clock className="w-3.5 h-3.5" /> Pendiente
                    </span>
                  )}
                  {r.estado === "ERROR" && (
                    <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5" /> Error
                    </span>
                  )}
                </td>
                <td className="p-3 text-[var(--text-muted)] text-xs">{r.coexistence ? "Sí" : "No"}</td>
                <td className="p-3 text-[var(--text-muted)] text-xs">
                  {r.created_at
                    ? new Date(typeof r.created_at === "string" ? r.created_at.replace(/\[.*?\]$/, "") : r.created_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => handleVerCalling(r.id)}
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                    title="Ver estado Calling/SIP"
                  >
                    {callingOpenId === r.id ? <ChevronUp className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEliminar(r.id)}
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Desconectar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
              {callingOpenId === r.id && (
                <tr className="border-b border-[var(--primary)]/10 bg-white/[0.02]">
                  <td colSpan={6} className="p-4">
                    {callingLoading && (
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Consultando Meta...
                      </p>
                    )}
                    {callingError && (
                      <p className="text-xs text-red-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> {callingError}
                      </p>
                    )}
                    {callingData && !callingLoading && (
                      <div className="text-xs text-[var(--text-muted)] space-y-1 font-mono">
                        <p>
                          calling.status:{" "}
                          <span className={callingData.status === "ENABLED" ? "text-green-400" : "text-yellow-400"}>
                            {callingData.status || "—"}
                          </span>
                        </p>
                        <p>
                          sip.status:{" "}
                          <span className={callingData.sip?.status === "ENABLED" ? "text-green-400" : "text-yellow-400"}>
                            {callingData.sip?.status || "—"}
                          </span>
                        </p>
                        <p>sip.webhook_delivery: {callingData.sip?.webhook_delivery || "—"}</p>
                        <p>
                          sip.servers:{" "}
                          {(callingData.sip?.servers || [])
                            .map((s: any) => `${s.hostname}:${s.port ?? 5061}`)
                            .join(", ") || "—"}
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
