"use client";

import { useState, useEffect } from "react";
import { Map, Plus, Edit2, Trash2, RefreshCw, Server, AlertTriangle } from "lucide-react";

interface Nodo {
  id: number;
  nombre: string;
  endpoint: string;
  token: string;
  logo_url?: string;
}

export default function CiudadesPage() {
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNodo, setEditingNodo] = useState<Nodo | null>(null);

  // Form state
  const [nombre, setNombre] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [logo, setLogo] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchNodos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nodos");
      if (res.ok) {
        const data = await res.json();
        setNodos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodos();
  }, []);

  const handleOpenModal = (nodo?: Nodo) => {
    if (nodo) {
      setEditingNodo(nodo);
      setNombre(nodo.nombre);
      setEndpoint(nodo.endpoint || "");
      setToken(nodo.token || "");
      setLogo(nodo.logo_url || "");
    } else {
      setEditingNodo(null);
      setNombre("");
      setEndpoint("");
      setToken("");
      setLogo("");
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingNodo ? "PUT" : "POST";
      const url = editingNodo ? `/api/nodos/${editingNodo.id}` : "/api/nodos";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, endpoint, token, logo_url: logo }),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchNodos();
      } else {
        alert("Error al guardar la ciudad/nodo");
      }
    } catch (error) {
      console.error(error);
      alert("Error de red");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta Ciudad/Nodo? Esto puede afectar a los usuarios asignados a ella.")) return;
    try {
      const res = await fetch(`/api/nodos/${id}`, { method: "DELETE" });
      if (res.ok) fetchNodos();
      else alert("Error al eliminar");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] tracking-wide flex items-center gap-2">
            <Map className="w-5 h-5 text-purple-400" />
            Configuración de Ciudades (Nodos)
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Gestioná los nodos geográficos y sus endpoints de conexión al EJB.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchNodos}
            className="p-2 rounded-lg border border-purple-500/30 text-[var(--text-muted)] hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500 text-purple-300 font-medium text-sm hover:bg-purple-500 hover:text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)]"
          >
            <Plus className="w-4 h-4" />
            Nueva Ciudad
          </button>
        </div>
      </div>

      <div className="bg-background-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--text-muted)]">
            <thead className="bg-black/40 text-[var(--text-main)] text-xs uppercase tracking-wider font-mono">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Ciudad / Nodo</th>
                <th className="px-6 py-4">API Endpoint</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-500 mb-2" />
                    <p className="text-sm">Cargando ciudades...</p>
                  </td>
                </tr>
              ) : nodos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-[var(--text-muted)]">
                    No hay ciudades configuradas.
                  </td>
                </tr>
              ) : (
                nodos.map((nodo) => (
                  <tr key={nodo.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs opacity-50">#{nodo.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                          {nodo.logo_url ? (
                            <img src={nodo.logo_url} alt={nodo.nombre} className="w-5 h-5 object-contain" />
                          ) : (
                            <Map className="w-4 h-4 text-purple-400" />
                          )}
                        </div>
                        <span className="font-bold text-[var(--text-main)]">{nodo.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-blue-400 opacity-60" />
                        <span className="font-mono text-xs text-blue-300">{nodo.endpoint || "N/A"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(nodo)}
                          className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(nodo.id)}
                          className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
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
          <div className="w-full max-w-md bg-background-panel border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                {editingNodo ? "Editar Ciudad" : "Nueva Ciudad"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Nombre de la Ciudad/Nodo</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Buenos Aires"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">API Endpoint</label>
                <input
                  type="text"
                  required
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="Ej: http://190.9.0.170:8080/api3"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Token de Seguridad</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="API3_TOKEN:xxxxxx"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
                />
                <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-500/70" /> Necesario para autenticarse en el Java EJB de esa ciudad.
                </p>
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
                  className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar Ciudad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
