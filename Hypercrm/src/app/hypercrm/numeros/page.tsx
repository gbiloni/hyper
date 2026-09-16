"use client";

import { Fragment, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Users, Plus, Edit2, Trash2, RefreshCw, MessageCircle, Send, Server, Download,
  Settings as SettingsIcon, FileText, Webhook, Activity, Phone, ChevronUp,
  AlertTriangle, CheckCircle2,
} from "lucide-react";

interface Cuenta {
  id: number;
  id_nodo: number;
  ciudades?: { id: number; nombre: string }[];
  canal: string;
  identificador: string;
  waba_id?: string | null;
  token: string;
  activo: number;
}

interface Nodo {
  id: number;
  nombre: string;
}

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID;

export default function NumerosPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form genérico: se usa para editar cualquier canal, y para dar de alta
  // canales que no son WhatsApp (Telegram/Messenger/Instagram no tienen
  // asistente de Meta ni auto-sync, así que van directo por acá).
  const [idNodos, setIdNodos] = useState<number[]>([]);
  const [canal, setCanal] = useState("whatsapp");
  const [identificador, setIdentificador] = useState("");
  const [token, setToken] = useState("");
  const [activo, setActivo] = useState(true);

  // Alta de WhatsApp nueva: tres métodos, igual que antes en Settings >
  // WhatsApp, ahora con la ciudad(es) elegida(s) arriba en idNodos.
  const [whatsappTab, setWhatsappTab] = useState<"manual" | "sync" | "oauth">("manual");
  const [syncWabaId, setSyncWabaId] = useState("");
  const [syncToken, setSyncToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const signupDataRef = useRef<{ waba_id?: string; phone_number_id?: string }>({});

  // Estado de Calling/SIP por fila (solo lectura, WhatsApp), para no tener
  // que hacer curl a mano contra Meta Graph API.
  const [callingOpenId, setCallingOpenId] = useState<number | null>(null);
  const [callingLoading, setCallingLoading] = useState(false);
  const [callingData, setCallingData] = useState<any>(null);
  const [callingError, setCallingError] = useState<string | null>(null);

  const fetchNodos = async () => {
    try {
      const res = await fetch("/api/nodos");
      if (res.ok) setNodos(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchCuentas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cuentas");
      if (res.ok) setCuentas(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNodos(); fetchCuentas(); }, [fetchCuentas]);

  // SDK de Facebook, para el Asistente de Meta (Embedded Signup)
  useEffect(() => {
    if (!META_APP_ID || document.getElementById("facebook-jssdk")) return;
    window.fbAsyncInit = function () {
      window.FB?.init({ appId: META_APP_ID, autoLogAppEvents: true, xfbml: true, version: "v26.0", cookie: true });
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
          signupDataRef.current = { waba_id: data.data?.waba_id, phone_number_id: data.data?.phone_number_id };
        }
      } catch (e) {}
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleOpenModal = (cuenta?: Cuenta) => {
    setFormError(null);
    setFormSuccess(null);
    if (cuenta) {
      setEditingId(cuenta.id);
      setIdNodos((cuenta.ciudades || []).map(c => c.id));
      setCanal(cuenta.canal);
      setIdentificador(cuenta.identificador);
      setToken(cuenta.token);
      setActivo(cuenta.activo === 1);
    } else {
      setEditingId(null);
      setIdNodos([]);
      setCanal("whatsapp");
      setIdentificador("");
      setToken("");
      setActivo(true);
      setWhatsappTab("manual");
      setSyncWabaId("");
      setSyncToken("");
    }
    setModalOpen(true);
  };

  const toggleNodo = (id: number) => {
    setIdNodos(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };

  // Edición (cualquier canal) y alta de canales sin flujo especial propio
  // (Telegram/Messenger/Instagram) -- WhatsApp nuevo usa los handlers de abajo.
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idNodos.length === 0) { alert("Elegí al menos una ciudad."); return; }
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/cuentas/${editingId}` : "/api/cuentas";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_nodos: idNodos, canal, identificador, token, activo }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setModalOpen(false);
        fetchCuentas();
      } else {
        alert(data.error || "Error al guardar la cuenta");
      }
    } catch (error) {
      console.error(error);
      alert("Error de red");
    } finally {
      setSaving(false);
    }
  };

  const handleAltaManualWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idNodos.length === 0) { setFormError("Elegí al menos una ciudad."); return; }
    if (!identificador.trim()) { setFormError("Ingresá el Phone Number ID o número de teléfono."); return; }
    setFormError(null); setFormSuccess(null); setConnecting(true);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-config/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number_id: identificador.trim(), token: token.trim(), id_nodos: idNodos }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormSuccess(data.message || "Número agregado correctamente.");
        setModalOpen(false);
        fetchCuentas();
      } else {
        setFormError(data.error || "Error guardando el número.");
      }
    } catch {
      setFormError("Error al conectar con la API.");
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idNodos.length === 0) { setFormError("Elegí al menos una ciudad."); return; }
    if (!syncWabaId.trim() || !syncToken.trim()) { setFormError("Ingresá el WABA ID y el Access Token de Meta."); return; }
    setFormError(null); setFormSuccess(null); setConnecting(true);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-config/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waba_id: syncWabaId.trim(), access_token: syncToken.trim(), id_nodos: idNodos }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormSuccess(data.message || "Números sincronizados con Meta.");
        setModalOpen(false);
        fetchCuentas();
      } else {
        setFormError(data.error || "Error sincronizando con Meta.");
      }
    } catch {
      setFormError("Error al conectar con Meta.");
    } finally {
      setConnecting(false);
    }
  };

  // Usa el WABA ID + token que ya quedaron guardados de una cuenta conectada
  // antes (Alta Manual o Asistente de Meta) -- no requiere pegar nada a mano.
  const handleSyncAuto = async () => {
    if (idNodos.length === 0) { setFormError("Elegí al menos una ciudad."); return; }
    setFormError(null); setFormSuccess(null); setConnecting(true);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-config/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_nodos: idNodos }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormSuccess(data.message || "Sincronización automática completada.");
        setModalOpen(false);
        fetchCuentas();
      } else {
        setFormError(data.error || "Error en la sincronización automática.");
      }
    } catch {
      setFormError("Error al conectar con Meta.");
    } finally {
      setConnecting(false);
    }
  };

  const handleConectarOAuth = () => {
    setFormError(null); setFormSuccess(null);
    if (idNodos.length === 0) { setFormError("Elegí al menos una ciudad."); return; }
    if (!META_APP_ID || !META_CONFIG_ID) {
      setFormError("Falta configurar NEXT_PUBLIC_META_APP_ID / NEXT_PUBLIC_META_CONFIG_ID en .env.");
      return;
    }
    if (!window.FB) { setFormError("El SDK de Facebook todavía no cargó. Esperá un segundo."); return; }

    signupDataRef.current = {};
    setConnecting(true);

    window.FB.login(
      (response: any) => {
        const code: string | undefined = response?.authResponse?.code;
        if (!code) { setFormError("No se recibió el código de Meta."); setConnecting(false); return; }

        const { waba_id, phone_number_id } = signupDataRef.current;
        if (!waba_id || !phone_number_id) {
          setFormError("No se recibieron los datos de la cuenta desde Meta.");
          setConnecting(false);
          return;
        }

        (async () => {
          try {
            const res = await fetch("/hypercrm/api/whatsapp-config/exchange", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code, waba_id, phone_number_id, id_nodos: idNodos }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
              setFormError(data.error || "Error vinculando la cuenta.");
            } else {
              setFormSuccess("¡Número vinculado exitosamente!");
              setModalOpen(false);
              fetchCuentas();
            }
          } catch (e: any) {
            setFormError(e?.message || "Error de red.");
          } finally {
            setConnecting(false);
          }
        })();
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" },
      }
    );
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Eliminar esta cuenta?")) return;
    try {
      await fetch(`/api/cuentas/${id}`, { method: "DELETE" });
      fetchCuentas();
    } catch (e) { console.error(e); }
  };

  const handleVerCalling = async (id: number) => {
    if (callingOpenId === id) { setCallingOpenId(null); return; }
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
  };

  const ciudadesCheckboxes = (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-green-300 uppercase tracking-wider">Ciudades / Nodos</label>
      <p className="text-[11px] text-[var(--text-muted)]">Un mismo número puede vincularse a más de una ciudad.</p>
      <div className="max-h-32 overflow-y-auto space-y-1 bg-black/50 border border-white/10 rounded-lg p-2">
        {nodos.length === 0 && <p className="text-xs text-[var(--text-muted)] px-1 py-1">No hay ciudades cargadas.</p>}
        {nodos.map(n => (
          <label key={n.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer text-sm text-white">
            <input
              type="checkbox"
              checked={idNodos.includes(n.id)}
              onChange={() => toggleNodo(n.id)}
              className="w-4 h-4 rounded bg-black/50 border-white/10 text-green-500 focus:ring-green-500/50"
            />
            {n.nombre}
          </label>
        ))}
      </div>
    </div>
  );

  const avisos = (
    <>
      {formError && (
        <p className="text-xs text-red-400 flex items-center gap-1 mt-2"><AlertTriangle className="w-3.5 h-3.5" /> {formError}</p>
      )}
      {formSuccess && (
        <p className="text-xs text-green-400 flex items-center gap-1 mt-2"><CheckCircle2 className="w-3.5 h-3.5" /> {formSuccess}</p>
      )}
    </>
  );

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Números / Canales
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Asigná líneas de WhatsApp, Telegram, Messenger o Instagram a una o más ciudades.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/hypercrm/settings/whatsapp/templates" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500/30 text-[var(--text-muted)] hover:text-green-400 hover:border-green-500 transition-colors text-sm">
            <FileText className="w-4 h-4" /> Plantillas
          </Link>
          <Link href="/hypercrm/settings/whatsapp/webhooks" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500/30 text-[var(--text-muted)] hover:text-green-400 hover:border-green-500 transition-colors text-sm">
            <Webhook className="w-4 h-4" /> Webhooks
          </Link>
          <Link href="/hypercrm/settings/whatsapp/health" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500/30 text-[var(--text-muted)] hover:text-green-400 hover:border-green-500 transition-colors text-sm">
            <Activity className="w-4 h-4" /> Estado API
          </Link>
          <button onClick={fetchCuentas} className="p-2 rounded-lg border border-green-500/30 text-[var(--text-muted)] hover:text-green-400 hover:bg-green-500/10 transition-colors" title="Refrescar">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 border border-green-500 text-green-300 font-medium text-sm hover:bg-green-500 hover:text-white transition-all shadow-[0_0_15px_rgba(34,197,94,0.15)]"
          >
            <Plus className="w-4 h-4" /> Vincular Nuevo Canal
          </button>
        </div>
      </div>

      <div className="bg-background-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--text-muted)]">
            <thead className="bg-black/40 text-[var(--text-main)] text-xs uppercase tracking-wider font-mono">
              <tr>
                <th className="px-6 py-4">Ciudad (Nodo)</th>
                <th className="px-6 py-4">Canal</th>
                <th className="px-6 py-4">Identificador (Número/Bot)</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-green-500 mb-2" />
                    <p className="text-sm">Cargando cuentas vinculadas...</p>
                  </td>
                </tr>
              ) : cuentas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-[var(--text-muted)]">
                    No hay cuentas configuradas todavía.
                  </td>
                </tr>
              ) : (
                cuentas.map((cta) => (
                  <Fragment key={cta.id}>
                  <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-bold text-white">
                      {cta.ciudades && cta.ciudades.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {cta.ciudades.map(c => (
                            <span key={c.id} className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-300 border border-green-500/20">
                              {c.nombre}
                            </span>
                          ))}
                        </div>
                      ) : (
                        `Nodo ID: ${cta.id_nodo}`
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {cta.canal === 'whatsapp' ? <MessageCircle className="w-4 h-4 text-green-400" /> : <Send className="w-4 h-4 text-blue-400" />}
                        <span className="capitalize text-[var(--text-main)]">{cta.canal}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[var(--text-main)]">
                      {cta.identificador}
                      {cta.waba_id && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">WABA: {cta.waba_id}</p>}
                    </td>
                    <td className="px-6 py-4">
                      {cta.activo === 1 ? (
                        <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400 border border-green-500/20">ACTIVO</span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 border border-red-500/20">INACTIVO</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {cta.canal === 'whatsapp' && (
                          <button onClick={() => handleVerCalling(cta.id)} className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors" title="Ver estado Calling/SIP">
                            {callingOpenId === cta.id ? <ChevronUp className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          </button>
                        )}
                        <button onClick={() => handleOpenModal(cta)} className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEliminar(cta.id)} className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {callingOpenId === cta.id && (
                    <tr className="bg-white/[0.02]">
                      <td colSpan={5} className="p-4">
                        {callingLoading && (
                          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Consultando Meta...</p>
                        )}
                        {callingError && (
                          <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {callingError}</p>
                        )}
                        {callingData && !callingLoading && (
                          <div className="text-xs text-[var(--text-muted)] space-y-1 font-mono">
                            <p>calling.status: <span className={callingData.status === "ENABLED" ? "text-green-400" : "text-yellow-400"}>{callingData.status || "—"}</span></p>
                            <p>sip.status: <span className={callingData.sip?.status === "ENABLED" ? "text-green-400" : "text-yellow-400"}>{callingData.sip?.status || "—"}</span></p>
                            <p>sip.webhook_delivery: {callingData.sip?.webhook_delivery || "—"}</p>
                            <p>sip.servers: {(callingData.sip?.servers || []).map((s: any) => `${s.hostname}:${s.port ?? 5061}`).join(", ") || "—"}</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ABM */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-background-panel border border-green-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                {editingId ? "Editar Canal" : "Vincular Nuevo Canal"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            {/* Edición (cualquier canal) o alta de canal que no es WhatsApp: form genérico */}
            {(editingId || canal !== "whatsapp") && (
              <form onSubmit={handleSave} className="p-6 space-y-4">
                {ciudadesCheckboxes}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-green-300 uppercase tracking-wider">Tipo de Canal</label>
                  <select
                    value={canal}
                    onChange={(e) => setCanal(e.target.value)}
                    disabled={!!editingId && canal === "whatsapp"}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors disabled:opacity-50"
                  >
                    <option value="whatsapp">WhatsApp Cloud API</option>
                    <option value="telegram">Bot de Telegram</option>
                    <option value="messenger">Facebook Messenger</option>
                    <option value="instagram">Instagram Direct</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-green-300 uppercase tracking-wider">Identificador (Número o Username)</label>
                  <input
                    type="text" required value={identificador} onChange={(e) => setIdentificador(e.target.value)}
                    placeholder={canal === 'telegram' ? "@mi_bot_soporte" : "5491122334455"}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-green-300 uppercase tracking-wider">Token de Integración (API Secret)</label>
                  <input
                    type="text" required value={token} onChange={(e) => setToken(e.target.value)}
                    placeholder="Pegue aquí el token o secret..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="activo" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="w-4 h-4 rounded bg-black/50 border-white/10 text-green-500 focus:ring-green-500/50" />
                  <label htmlFor="activo" className="text-sm text-[var(--text-main)] cursor-pointer">Canal Activo (Recibe y envía mensajes)</label>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancelar</button>
                  <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50">
                    {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Vincular Canal"}
                  </button>
                </div>
              </form>
            )}

            {/* Alta de WhatsApp nueva: mismos 3 métodos de antes, con ciudades */}
            {!editingId && canal === "whatsapp" && (
              <div className="p-6 space-y-4">
                {ciudadesCheckboxes}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-green-300 uppercase tracking-wider">Tipo de Canal</label>
                  <select
                    value={canal}
                    onChange={(e) => setCanal(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="whatsapp">WhatsApp Cloud API</option>
                    <option value="telegram">Bot de Telegram</option>
                    <option value="messenger">Facebook Messenger</option>
                    <option value="instagram">Instagram Direct</option>
                  </select>
                </div>

                <div className="flex border-b border-green-500/20 gap-4 text-xs font-semibold uppercase tracking-wider">
                  <button type="button" onClick={() => { setWhatsappTab("manual"); setFormError(null); setFormSuccess(null); }}
                    className={`pb-2 transition-colors flex items-center gap-1.5 ${whatsappTab === "manual" ? "border-b-2 border-green-400 text-green-400" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}>
                    <Server className="w-4 h-4" /> Alta Manual
                  </button>
                  <button type="button" onClick={() => { setWhatsappTab("sync"); setFormError(null); setFormSuccess(null); }}
                    className={`pb-2 transition-colors flex items-center gap-1.5 ${whatsappTab === "sync" ? "border-b-2 border-green-400 text-green-400" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}>
                    <Download className="w-4 h-4" /> Leer de Meta
                  </button>
                  <button type="button" onClick={() => { setWhatsappTab("oauth"); setFormError(null); setFormSuccess(null); }}
                    className={`pb-2 transition-colors flex items-center gap-1.5 ${whatsappTab === "oauth" ? "border-b-2 border-green-400 text-green-400" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}>
                    <SettingsIcon className="w-4 h-4" /> Asistente de Meta
                  </button>
                </div>

                {whatsappTab === "manual" && (
                  <form onSubmit={handleAltaManualWhatsapp} className="space-y-3 pt-2">
                    <p className="text-xs text-[var(--text-muted)]">Ingresá directamente el Phone Number ID o número telefónico.</p>
                    <input type="text" value={identificador} onChange={(e) => setIdentificador(e.target.value)} placeholder="Phone Number ID / Número (ej: 92235373037)"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 font-mono" />
                    <input type="text" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Meta Access Token (Opcional)"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 font-mono" />
                    <div className="pt-2 flex justify-end gap-3">
                      <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancelar</button>
                      <button type="submit" disabled={connecting} className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-all disabled:opacity-50">
                        {connecting ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </form>
                )}

                {whatsappTab === "sync" && (
                  <form onSubmit={handleSyncMeta} className="space-y-3 pt-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-xs text-[var(--text-muted)]">Ingresá el WABA ID y el Access Token de Meta para importar todos los números registrados.</p>
                      <button
                        type="button"
                        onClick={handleSyncAuto}
                        disabled={connecting}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-500/40 text-green-400 text-xs font-semibold hover:bg-green-500/10 transition-colors disabled:opacity-50 whitespace-nowrap"
                        title="Usa el WABA ID y token de una cuenta ya conectada, sin pedirte nada"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${connecting ? "animate-spin" : ""}`} /> Sincronizar automáticamente
                      </button>
                    </div>
                    <input type="text" value={syncWabaId} onChange={(e) => setSyncWabaId(e.target.value)} placeholder="WABA ID (WhatsApp Business Account ID)"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 font-mono" />
                    <input type="text" value={syncToken} onChange={(e) => setSyncToken(e.target.value)} placeholder="Meta Access Token"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 font-mono" />
                    <div className="pt-2 flex justify-end gap-3">
                      <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancelar</button>
                      <button type="submit" disabled={connecting} className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-all disabled:opacity-50">
                        {connecting ? "Sincronizando..." : "Sincronizar Números"}
                      </button>
                    </div>
                  </form>
                )}

                {whatsappTab === "oauth" && (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-[var(--text-muted)]">Usa el asistente emergente oficial de Meta para registrar una línea nueva.</p>
                    <div className="pt-2 flex justify-end gap-3">
                      <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancelar</button>
                      <button type="button" onClick={handleConectarOAuth} disabled={connecting} className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-all disabled:opacity-50">
                        <Plus className="w-4 h-4" /> {connecting ? "Conectando..." : "Abrir Asistente de Meta"}
                      </button>
                    </div>
                  </div>
                )}

                {avisos}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
