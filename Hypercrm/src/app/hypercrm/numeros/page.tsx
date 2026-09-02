"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Edit2, Trash2, RefreshCw, MessageCircle, Send } from "lucide-react";

interface Cuenta {
  id: number;
  id_nodo: number;
  ciudad_nombre?: string;
  canal: string;
  identificador: string;
  token: string;
  activo: number;
}

interface Nodo {
  id: number;
  nombre: string;
}

export default function NumerosPage() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [idNodo, setIdNodo] = useState<number | "">("");
  const [canal, setCanal] = useState("whatsapp");
  const [identificador, setIdentificador] = useState("");
  const [token, setToken] = useState("");
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    fetchNodos();
    fetchCuentas();
  }, []);

  const fetchNodos = async () => {
    try {
      const res = await fetch("/api/nodos");
      if (res.ok) setNodos(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchCuentas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cuentas");
      if (res.ok) setCuentas(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleOpenModal = (cuenta?: Cuenta) => {
    if (cuenta) {
      setEditingId(cuenta.id);
      setIdNodo(cuenta.id_nodo);
      setCanal(cuenta.canal);
      setIdentificador(cuenta.identificador);
      setToken(cuenta.token);
      setActivo(cuenta.activo === 1);
    } else {
      setEditingId(null);
      setIdNodo(nodos.length > 0 ? nodos[0].id : "");
      setCanal("whatsapp");
      setIdentificador("");
      setToken("");
      setActivo(true);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/cuentas/${editingId}` : "/api/cuentas";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_nodo: idNodo, canal, identificador, token, activo }),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchCuentas();
      } else {
        alert("Error al guardar la cuenta");
      }
    } catch (error) {
      console.error(error);
      alert("Error de red");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Configuración de Números / Canales
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Asigná líneas de WhatsApp o bots de Telegram a cada Ciudad específica.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCuentas}
            className="p-2 rounded-lg border border-green-500/30 text-[var(--text-muted)] hover:text-green-400 hover:bg-green-500/10 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 border border-green-500 text-green-300 font-medium text-sm hover:bg-green-500 hover:text-white transition-all shadow-[0_0_15px_rgba(34,197,94,0.15)]"
          >
            <Plus className="w-4 h-4" />
            Vincular Nuevo Canal
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
                  <tr key={cta.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-bold text-white">
                      {cta.ciudad_nombre || `Nodo ID: ${cta.id_nodo}`}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {cta.canal === 'whatsapp' ? (
                          <MessageCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Send className="w-4 h-4 text-blue-400" />
                        )}
                        <span className="capitalize text-[var(--text-main)]">{cta.canal}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[var(--text-main)]">
                      {cta.identificador}
                    </td>
                    <td className="px-6 py-4">
                      {cta.activo === 1 ? (
                        <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400 border border-green-500/20">
                          ACTIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 border border-red-500/20">
                          INACTIVO
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(cta)}
                          className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ABM */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-background-panel border border-green-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                {editingId ? "Editar Canal" : "Vincular Nuevo Canal"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-green-300 uppercase tracking-wider">Ciudad / Nodo</label>
                <select
                  required
                  value={idNodo}
                  onChange={(e) => setIdNodo(Number(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                >
                  <option value="" disabled>Seleccione una ciudad...</option>
                  {nodos.map(n => (
                    <option key={n.id} value={n.id}>{n.nombre}</option>
                  ))}
                </select>
              </div>

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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-green-300 uppercase tracking-wider">Identificador (Número o Username)</label>
                <input
                  type="text"
                  required
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder={canal === 'telegram' ? "@mi_bot_soporte" : "5491122334455"}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-green-300 uppercase tracking-wider">Token de Integración (API Secret)</label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Pegue aquí el token o secret..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="w-4 h-4 rounded bg-black/50 border-white/10 text-green-500 focus:ring-green-500/50"
                />
                <label htmlFor="activo" className="text-sm text-[var(--text-main)] cursor-pointer">
                  Canal Activo (Recibe y envía mensajes)
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Vincular Canal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
