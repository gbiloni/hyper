"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Phone,
  Users,
  Headphones,
  Plus,
  Trash2,
  Power,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface ExtensionRow {
  id: number;
  id_usuario: number;
  extension: string;
  activo: 0 | 1;
  agente_nombre: string;
  agente_username: string;
  created_at: string;
}

interface AgenteDisponible {
  id: number;
  nombre: string;
  username: string;
}

interface ColaRow {
  id: number;
  nombre: string;
  estrategia: string;
  timeout_segundos: number;
  miembros: string;
  activo: 0 | 1;
}

interface ExtensionDisponible {
  extension: string;
  agente_nombre: string;
}

const ESTRATEGIAS = [
  { value: "ringall", label: "Suenan todos a la vez" },
  { value: "leastrecent", label: "El que atendió hace más tiempo" },
  { value: "fewestcalls", label: "El que atendió menos llamadas" },
  { value: "random", label: "Aleatorio" },
  { value: "rrmemory", label: "Round robin (con memoria)" },
  { value: "linear", label: "Orden fijo de la lista" },
  { value: "wrandom", label: "Aleatorio ponderado" },
];

export default function TelefoniaSettingsPage() {
  const [extensiones, setExtensiones] = useState<ExtensionRow[]>([]);
  const [agentesDisponibles, setAgentesDisponibles] = useState<AgenteDisponible[]>([]);
  const [colas, setColas] = useState<ColaRow[]>([]);
  const [extensionesDisponibles, setExtensionesDisponibles] = useState<ExtensionDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario de alta de extensión
  const [nuevoAgenteId, setNuevoAgenteId] = useState("");
  const [nuevoInterno, setNuevoInterno] = useState("");

  // Formulario de alta de cola
  const [nuevaColaNombre, setNuevaColaNombre] = useState("");
  const [nuevaColaEstrategia, setNuevaColaEstrategia] = useState("ringall");
  const [nuevaColaTimeout, setNuevaColaTimeout] = useState("20");
  const [nuevaColaMiembros, setNuevaColaMiembros] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rExt, rCol] = await Promise.all([
        fetch("/hypercrm/api/telefonia/extensiones"),
        fetch("/hypercrm/api/telefonia/colas"),
      ]);
      if (rExt.ok) {
        const d = await rExt.json();
        setExtensiones(d.extensiones || []);
        setAgentesDisponibles(d.agentesDisponibles || []);
      }
      if (rCol.ok) {
        const d = await rCol.json();
        setColas(d.colas || []);
        setExtensionesDisponibles(d.extensionesDisponibles || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function notify(err: string | null, ok: string | null) {
    setError(err);
    setSuccessMsg(ok);
    if (ok) setTimeout(() => setSuccessMsg(null), 4000);
  }

  async function handleAltaExtension(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    notify(null, null);
    try {
      const res = await fetch("/hypercrm/api/telefonia/extensiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: Number(nuevoAgenteId), extension: nuevoInterno.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando el interno.");
      notify(null, `Interno ${nuevoInterno} creado.`);
      setNuevoAgenteId("");
      setNuevoInterno("");
      loadData();
    } catch (err: any) {
      notify(err.message, null);
    } finally {
      setBusy(false);
    }
  }

  async function handleExtensionAccion(id: number, accion: "activar" | "desactivar" | "regenerar_secret") {
    setBusy(true);
    notify(null, null);
    try {
      const res = await fetch(`/hypercrm/api/telefonia/extensiones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error actualizando el interno.");
      loadData();
    } catch (err: any) {
      notify(err.message, null);
    } finally {
      setBusy(false);
    }
  }

  async function handleEliminarExtension(id: number, extension: string) {
    if (!confirm(`¿Eliminar el interno ${extension}? Esto lo borra también de Issabel.`)) return;
    setBusy(true);
    notify(null, null);
    try {
      const res = await fetch(`/hypercrm/api/telefonia/extensiones/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error eliminando el interno.");
      loadData();
    } catch (err: any) {
      notify(err.message, null);
    } finally {
      setBusy(false);
    }
  }

  async function handleAltaCola(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    notify(null, null);
    try {
      const res = await fetch("/hypercrm/api/telefonia/colas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevaColaNombre.trim(),
          estrategia: nuevaColaEstrategia,
          timeout_segundos: Number(nuevaColaTimeout),
          miembros: nuevaColaMiembros,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando la cola.");
      notify(null, `Cola "${nuevaColaNombre}" creada.`);
      setNuevaColaNombre("");
      setNuevaColaMiembros([]);
      loadData();
    } catch (err: any) {
      notify(err.message, null);
    } finally {
      setBusy(false);
    }
  }

  async function handleColaAccion(id: number, accion: "activar" | "desactivar") {
    setBusy(true);
    notify(null, null);
    try {
      const res = await fetch(`/hypercrm/api/telefonia/colas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error actualizando la cola.");
      loadData();
    } catch (err: any) {
      notify(err.message, null);
    } finally {
      setBusy(false);
    }
  }

  async function handleEliminarCola(id: number, nombre: string) {
    if (!confirm(`¿Eliminar la cola "${nombre}"? Esto la borra también de Issabel.`)) return;
    setBusy(true);
    notify(null, null);
    try {
      const res = await fetch(`/hypercrm/api/telefonia/colas/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error eliminando la cola.");
      loadData();
    } catch (err: any) {
      notify(err.message, null);
    } finally {
      setBusy(false);
    }
  }

  function toggleMiembro(ext: string) {
    setNuevaColaMiembros((prev) =>
      prev.includes(ext) ? prev.filter((m) => m !== ext) : [...prev, ext]
    );
  }

  const inputClass =
    "bg-background border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]";
  const btnClass =
    "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)] text-[var(--primary)] font-semibold text-sm hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-50";

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] tracking-wide flex items-center gap-2">
            <Phone className="w-5 h-5 text-[var(--primary)]" />
            Telefonía (Issabel)
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Internos, agentes y colas del softphone embebido. Los cambios se aplican en vivo en
            sip01.hyperisp.com.ar.
          </p>
        </div>
        <button
          onClick={loadData}
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
      {successMsg && (
        <p className="text-xs text-green-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> {successMsg}
        </p>
      )}

      {/* EXTENSIONES / AGENTES */}
      <div className="bg-background-panel border border-[var(--primary)]/20 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--primary)]" /> Internos y agentes
        </h2>

        <form onSubmit={handleAltaExtension} className="flex flex-col sm:flex-row gap-3">
          <select
            value={nuevoAgenteId}
            onChange={(e) => setNuevoAgenteId(e.target.value)}
            className={`${inputClass} flex-1`}
            required
          >
            <option value="">Elegir agente...</option>
            {agentesDisponibles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre} ({a.username})
              </option>
            ))}
          </select>
          <input
            type="text"
            value={nuevoInterno}
            onChange={(e) => setNuevoInterno(e.target.value.replace(/\D/g, ""))}
            placeholder="Interno (ej: 1001)"
            className={`${inputClass} sm:w-40`}
            required
          />
          <button type="submit" disabled={busy} className={btnClass}>
            <Plus className="w-4 h-4" /> Crear interno
          </button>
        </form>

        <div className="overflow-hidden rounded-xl border border-[var(--primary)]/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--primary)]/20 text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="text-left p-3">Agente</th>
                <th className="text-left p-3">Interno</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {extensiones.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="text-center p-6 text-[var(--text-muted)] text-sm">
                    Todavía no hay internos creados en este nodo.
                  </td>
                </tr>
              )}
              {extensiones.map((ext) => (
                <tr key={ext.id} className="border-b border-[var(--primary)]/10 hover:bg-white/[0.02]">
                  <td className="p-3 text-[var(--text-main)]">{ext.agente_nombre}</td>
                  <td className="p-3 text-[var(--text-muted)] font-mono">{ext.extension}</td>
                  <td className="p-3">
                    {ext.activo ? (
                      <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[var(--text-muted)] text-xs">
                        <Power className="w-3.5 h-3.5" /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    {ext.activo ? (
                      <button
                        onClick={() => handleExtensionAccion(ext.id, "desactivar")}
                        disabled={busy}
                        className="px-2 py-1 rounded-md text-xs text-[var(--text-muted)] hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleExtensionAccion(ext.id, "activar")}
                        disabled={busy}
                        className="px-2 py-1 rounded-md text-xs text-[var(--text-muted)] hover:text-green-400 hover:bg-green-500/10 transition-colors"
                      >
                        Activar
                      </button>
                    )}
                    <button
                      onClick={() => handleExtensionAccion(ext.id, "regenerar_secret")}
                      disabled={busy}
                      className="px-2 py-1 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                      title="Genera una credencial nueva para este interno"
                    >
                      Rotar secret
                    </button>
                    <button
                      onClick={() => handleEliminarExtension(ext.id, ext.extension)}
                      disabled={busy}
                      className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors inline-flex"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COLAS */}
      <div className="bg-background-panel border border-[var(--primary)]/20 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
          <Headphones className="w-4 h-4 text-[var(--primary)]" /> Colas
        </h2>

        <form onSubmit={handleAltaCola} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={nuevaColaNombre}
              onChange={(e) => setNuevaColaNombre(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="Nombre (ej: soporte)"
              className={inputClass}
              required
            />
            <select
              value={nuevaColaEstrategia}
              onChange={(e) => setNuevaColaEstrategia(e.target.value)}
              className={inputClass}
            >
              {ESTRATEGIAS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={5}
              max={300}
              value={nuevaColaTimeout}
              onChange={(e) => setNuevaColaTimeout(e.target.value)}
              placeholder="Timeout (seg)"
              className={inputClass}
            />
          </div>

          <div>
            <p className="text-xs text-[var(--text-muted)] mb-2">Miembros (internos activos):</p>
            <div className="flex flex-wrap gap-2">
              {extensionesDisponibles.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">No hay internos activos todavía.</p>
              )}
              {extensionesDisponibles.map((e) => (
                <label
                  key={e.extension}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                    nuevaColaMiembros.includes(e.extension)
                      ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
                      : "border-[var(--primary)]/20 text-[var(--text-muted)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={nuevaColaMiembros.includes(e.extension)}
                    onChange={() => toggleMiembro(e.extension)}
                  />
                  {e.extension} · {e.agente_nombre}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={busy} className={btnClass}>
            <Plus className="w-4 h-4" /> Crear cola
          </button>
        </form>

        <div className="overflow-hidden rounded-xl border border-[var(--primary)]/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--primary)]/20 text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Estrategia</th>
                <th className="text-left p-3">Timeout</th>
                <th className="text-left p-3">Miembros</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {colas.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center p-6 text-[var(--text-muted)] text-sm">
                    Todavía no hay colas creadas en este nodo.
                  </td>
                </tr>
              )}
              {colas.map((c) => (
                <tr key={c.id} className="border-b border-[var(--primary)]/10 hover:bg-white/[0.02]">
                  <td className="p-3 text-[var(--text-main)] font-mono">{c.nombre}</td>
                  <td className="p-3 text-[var(--text-muted)] text-xs">
                    {ESTRATEGIAS.find((s) => s.value === c.estrategia)?.label || c.estrategia}
                  </td>
                  <td className="p-3 text-[var(--text-muted)] text-xs">{c.timeout_segundos}s</td>
                  <td className="p-3 text-[var(--text-muted)] text-xs">{c.miembros || "—"}</td>
                  <td className="p-3">
                    {c.activo ? (
                      <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[var(--text-muted)] text-xs">
                        <Power className="w-3.5 h-3.5" /> Inactiva
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    {c.activo ? (
                      <button
                        onClick={() => handleColaAccion(c.id, "desactivar")}
                        disabled={busy}
                        className="px-2 py-1 rounded-md text-xs text-[var(--text-muted)] hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleColaAccion(c.id, "activar")}
                        disabled={busy}
                        className="px-2 py-1 rounded-md text-xs text-[var(--text-muted)] hover:text-green-400 hover:bg-green-500/10 transition-colors"
                      >
                        Activar
                      </button>
                    )}
                    <button
                      onClick={() => handleEliminarCola(c.id, c.nombre)}
                      disabled={busy}
                      className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors inline-flex"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
