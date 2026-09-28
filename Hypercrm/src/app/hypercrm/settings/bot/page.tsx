"use client";

import { useState, useEffect } from "react";
import { Bot, Plus, Trash2, RefreshCw, MessageCircle, Send, Zap, Edit2, ChevronDown } from "lucide-react";

interface Nodo { id: number; nombre: string; }
interface Regla {
  id: number;
  id_nodo: number;
  canal: string;
  pregunta: string;
  respuesta: string;
  tipo: string;
  orden: number;
  activo: number;
}

const INTENTS_SUGERIDAS = [
  { keyword: "saldo", desc: "Consulta saldo/deuda" },
  { keyword: "factura", desc: "Pide factura/recibo" },
  { keyword: "reclamo", desc: "Reporta problema" },
  { keyword: "hola", desc: "Saludo inicial" },
  { keyword: "horario", desc: "Consulta horarios" },
];

export default function BotConfigPage() {
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [selectedNodo, setSelectedNodo] = useState<number | "">("");
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [canal, setCanal] = useState("all");
  const [tipo, setTipo] = useState("keyword");
  const [orden, setOrden] = useState(0);
  const [saving, setSaving] = useState(false);

  // Interactive Form
  const [interactiveBodyText, setInteractiveBodyText] = useState("");
  const [interactiveBotonLabel, setInteractiveBotonLabel] = useState("Opciones");
  const [botones, setBotones] = useState<{ id: string; title: string }[]>([]);
  const [filas, setFilas] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    fetch("/api/nodos")
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setNodos(list);
        if (list.length > 0) setSelectedNodo(list[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedNodo) return;
    loadReglas();
  }, [selectedNodo]);

  const loadReglas = async () => {
    if (!selectedNodo) return;
    setLoading(true);
    const res = await fetch(`/api/bot-config?id_nodo=${selectedNodo}`);
    if (res.ok) setReglas(await res.json());
    setLoading(false);
  };

  const openModal = (regla?: Regla) => {
    if (regla) {
      setEditingId(regla.id);
      setPregunta(regla.pregunta);
      setCanal(regla.canal);
      setTipo(regla.tipo);
      setOrden(regla.orden);
      
      if (regla.tipo === 'interactive_button' || regla.tipo === 'interactive_list') {
        try {
          const parsed = JSON.parse(regla.respuesta);
          setRespuesta("");
          setInteractiveBodyText(parsed.bodyText || "");
          setInteractiveBotonLabel(parsed.botonLabel || "Opciones");
          setBotones(parsed.botones || []);
          setFilas(parsed.filas || []);
        } catch(e) {
          setRespuesta(regla.respuesta);
        }
      } else {
        setRespuesta(regla.respuesta);
        setInteractiveBodyText("");
        setBotones([]);
        setFilas([]);
      }
    } else {
      setEditingId(null);
      setPregunta(""); setRespuesta(""); setCanal("all"); setTipo("keyword"); setOrden(reglas.length);
      setInteractiveBodyText(""); setBotones([]); setFilas([]); setInteractiveBotonLabel("Opciones");
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let finalRespuesta = respuesta;
    if (tipo === 'interactive_button') {
      finalRespuesta = JSON.stringify({ bodyText: interactiveBodyText, botones });
    } else if (tipo === 'interactive_list') {
      finalRespuesta = JSON.stringify({ bodyText: interactiveBodyText, botonLabel: interactiveBotonLabel, filas });
    }
    
    const finalCanal = (tipo === 'interactive_button' || tipo === 'interactive_list') ? 'whatsapp' : canal;

    const url = editingId ? `/api/bot-config/${editingId}` : "/api/bot-config";
    const method = editingId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_nodo: selectedNodo, pregunta, respuesta: finalRespuesta, canal: finalCanal, tipo, orden, activo: 1 }),
    });
    setSaving(false);
    setModalOpen(false);
    loadReglas();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta regla?")) return;
    await fetch(`/api/bot-config/${id}`, { method: "DELETE" });
    loadReglas();
  };

  const canalColor: Record<string, string> = {
    all: "text-purple-400 bg-purple-900/30 border-purple-500/40",
    whatsapp: "text-green-400 bg-green-900/30 border-green-500/40",
    telegram: "text-sky-400 bg-sky-900/30 border-sky-500/40",
    messenger: "text-blue-400 bg-blue-900/30 border-blue-500/40",
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] tracking-wide flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            Configuración del Bot Automático
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Definí las respuestas automáticas por ciudad y canal. El bot evalúa las reglas en orden de prioridad.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadReglas} className="p-2 rounded-lg border border-purple-500/30 text-[var(--text-muted)] hover:text-purple-400 hover:bg-purple-500/10 transition-colors" title="Refrescar">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500 text-purple-300 font-medium text-sm hover:bg-purple-500 hover:text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Plus className="w-4 h-4" /> Nueva Regla
          </button>
        </div>
      </div>

      {/* Selector de ciudad */}
      <div className="flex items-center gap-4 bg-background-panel/60 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
        <span className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">Ciudad / Nodo:</span>
        <select
          value={selectedNodo}
          onChange={e => setSelectedNodo(Number(e.target.value))}
          className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
        >
          {nodos.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
        </select>
      </div>

      {/* Intents sugeridas */}
      <div className="bg-background-panel/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur-sm">
        <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" /> Keywords sugeridas para configurar
        </p>
        <div className="flex flex-wrap gap-2">
          {INTENTS_SUGERIDAS.map(i => (
            <button
              key={i.keyword}
              onClick={() => { setPregunta(i.keyword); setModalOpen(true); setEditingId(null); setRespuesta(""); setCanal("all"); setTipo("keyword"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-purple-500/30 text-purple-300 text-xs font-mono hover:bg-purple-500/20 hover:border-purple-400 transition-colors"
            >
              <span className="text-purple-400">"{i.keyword}"</span>
              <span className="text-gray-500">—</span>
              {i.desc}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de reglas */}
      <div className="bg-background-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--text-muted)]">
            <thead className="bg-black/40 text-[var(--text-main)] text-xs uppercase tracking-wider font-mono">
              <tr>
                <th className="px-4 py-4 w-8">#</th>
                <th className="px-4 py-4">Canal</th>
                <th className="px-4 py-4">Keyword / Trigger</th>
                <th className="px-4 py-4">Respuesta</th>
                <th className="px-4 py-4 text-center">Tipo</th>
                <th className="px-4 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-500 mb-2" /><p className="text-sm">Cargando reglas...</p></td></tr>
              ) : reglas.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--text-muted)]">
                  <Bot className="w-10 h-10 mx-auto opacity-20 mb-2" />
                  <p>No hay reglas configuradas para esta ciudad.</p>
                  <p className="text-xs mt-1">Creá la primera desde los atajos de arriba o con el botón "Nueva Regla".</p>
                </td></tr>
              ) : (
                reglas.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs opacity-40">{r.orden}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] border px-2 py-0.5 rounded font-mono ${canalColor[r.canal] || canalColor.all}`}>
                        {r.canal === "all" ? "TODOS" : r.canal.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-purple-300">"{r.pregunta}"</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-main)] max-w-xs truncate">
                      {r.tipo === 'interactive_button' ? <span className="text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded border border-purple-500/40 font-semibold">[Botones Interactivos]</span> :
                       r.tipo === 'interactive_list' ? <span className="text-cyan-400 bg-cyan-900/30 px-2 py-0.5 rounded border border-cyan-500/40 font-semibold">[Lista Interactiva]</span> :
                       r.tipo === 'escalate' ? <span className="text-orange-400 bg-orange-900/30 px-2 py-0.5 rounded border border-orange-500/40 font-semibold">[Transferir a Humano]</span> :
                       r.respuesta}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] border border-white/10 px-2 py-0.5 rounded font-mono text-gray-400">{r.tipo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(r)} className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-background-panel border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                {editingId ? "Editar Regla" : "Nueva Regla del Bot"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Canal</label>
                  <select value={(tipo === 'interactive_button' || tipo === 'interactive_list') ? 'whatsapp' : canal} disabled={tipo === 'interactive_button' || tipo === 'interactive_list'} onChange={e => setCanal(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50">
                    <option value="all">Todos los canales</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="messenger">Messenger</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Tipo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors">
                    <option value="keyword">Keyword (texto exacto/parcial)</option>
                    <option value="default">Default (si ninguna otra coincide)</option>
                    <option value="interactive_button">WhatsApp: Botones Interactivos (hasta 3)</option>
                    <option value="interactive_list">WhatsApp: Lista Interactiva (hasta 10)</option>
                    <option value="escalate">Transferir a Humano (Escalar)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Keyword o Frase Disparadora</label>
                <input type="text" required value={pregunta} onChange={e => setPregunta(e.target.value)} placeholder='Ej: "saldo", "no funciona", "hola"' className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors font-mono" />
              </div>

              {tipo === 'interactive_button' || tipo === 'interactive_list' ? (
                <div className="space-y-4 border border-purple-500/30 p-4 rounded-xl bg-black/30">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Texto Principal del Mensaje</label>
                    <textarea required value={interactiveBodyText} onChange={e => setInteractiveBodyText(e.target.value)} rows={2} placeholder="Hola, ¿en qué te ayudamos?" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors resize-none" />
                  </div>
                  
                  {tipo === 'interactive_list' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Texto del Botón que abre la Lista</label>
                      <input type="text" required value={interactiveBotonLabel} onChange={e => setInteractiveBotonLabel(e.target.value)} placeholder="Ver opciones" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                        {tipo === 'interactive_button' ? 'Botones (Máx 3)' : 'Filas de la Lista (Máx 10)'}
                      </label>
                      <button type="button" onClick={() => {
                        if (tipo === 'interactive_button' && botones.length < 3) setBotones([...botones, {id: '', title: ''}]);
                        if (tipo === 'interactive_list' && filas.length < 10) setFilas([...filas, {id: '', title: ''}]);
                      }} className="text-xs bg-purple-500/20 text-purple-300 hover:text-white px-2 py-1 rounded border border-purple-500/40 transition-colors">
                        + Añadir
                      </button>
                    </div>
                    {(tipo === 'interactive_button' ? botones : filas).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input type="text" placeholder="ID Interno (ej. action_pagar)" required value={item.id} onChange={(e) => {
                          const arr = tipo === 'interactive_button' ? [...botones] : [...filas];
                          arr[idx].id = e.target.value;
                          tipo === 'interactive_button' ? setBotones(arr) : setFilas(arr);
                        }} className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono focus:border-purple-500 transition-colors outline-none" />
                        <input type="text" placeholder="Texto Visible" required value={item.title} onChange={(e) => {
                          const arr = tipo === 'interactive_button' ? [...botones] : [...filas];
                          arr[idx].title = e.target.value;
                          tipo === 'interactive_button' ? setBotones(arr) : setFilas(arr);
                        }} className="flex-1 bg-black/50 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 transition-colors outline-none" />
                        <button type="button" onClick={() => {
                          const arr = tipo === 'interactive_button' ? [...botones] : [...filas];
                          arr.splice(idx, 1);
                          tipo === 'interactive_button' ? setBotones(arr) : setFilas(arr);
                        }} className="text-red-400 hover:text-red-300 p-1 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {(tipo === 'interactive_button' ? botones : filas).length === 0 && (
                      <p className="text-xs text-gray-500 italic">No hay elementos configurados.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                    {tipo === 'escalate' ? 'Mensaje de Transferencia' : 'Respuesta Automática'}
                  </label>
                  <textarea required={tipo !== 'interactive_button' && tipo !== 'interactive_list'} value={respuesta} onChange={e => setRespuesta(e.target.value)} rows={4} placeholder={tipo === 'escalate' ? "Te transferimos con un humano..." : "Hola {nombre}, tu saldo actual es {saldo}. Para más consultas escribí al..."} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors resize-none" />
                  {tipo !== 'escalate' && <p className="text-[10px] text-gray-500">Variables disponibles: <span className="text-purple-400 font-mono">{"{nombre}"}</span>, <span className="text-purple-400 font-mono">{"{saldo}"}</span></p>}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Orden de Prioridad</label>
                <input type="number" value={orden} onChange={e => setOrden(Number(e.target.value))} min={0} className="w-24 bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar Regla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
