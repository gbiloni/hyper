"use client";

import { useState, useEffect } from "react";
import { getDocsisStats } from "./actions";
import { Cable, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const GREEN   = "#00ff9d"; // Verde neón brillante
const PURPLE  = "#ff00ea"; // Magenta neón brillante
const CYAN    = "#00f3ff"; // Cyan brillante
const YELLOW  = "#ffee00"; // Amarillo brillante
const RED     = "#ff3333"; // Rojo brillante
const WHITE   = "#ffffff"; // Blanco

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl border bg-black/50 backdrop-blur-sm" style={{ borderColor: `${color}30`, boxShadow: `0 0 15px ${color}15` }}>
      <span className="text-3xl font-black font-mono" style={{ color, textShadow: `0 0 15px ${color}` }}>{value}</span>
      <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-mono">{label}</span>
    </div>
  );
}

export default function DocsisStats() {
  const [open, setOpen] = useState(false);
  const [expandedCmts, setExpandedCmts] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await getDocsisStats();
    if (res.error) setError(res.error);
    else setData(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (!loading && !data && !error) return null;
  if (!loading && data && data.totalCmts === 0) return null;

  return (
    <div className="col-span-full relative z-10">
      <button onClick={() => { setOpen(o => !o); if (!data) load(); }} className="w-full flex items-center justify-between p-5 rounded-2xl border border-neon-magenta/30 bg-black/50 backdrop-blur-md hover:bg-neon-magenta/5 hover:border-neon-magenta/60 transition-all shadow-[0_0_20px_rgba(255,0,255,0.08)] group">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-neon-magenta/10 border border-neon-magenta/30">
            <Cable className="w-6 h-6 text-neon-magenta drop-shadow-[0_0_8px_var(--neon-magenta)]" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white tracking-widest uppercase">DOCSIS / HFC</div>
            <div className="text-[11px] text-slate-500 font-mono tracking-wider">CMTS → Shelf → Puerto → Cable Modem</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {loading && <RefreshCw className="w-4 h-4 text-neon-magenta animate-spin" />}
          <span className={`text-slate-400 text-xl transition-transform duration-300 ${open ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-neon-magenta/20 bg-black/60 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(255,0,255,0.1)] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-widest uppercase flex items-center gap-2">
              <Cable className="w-5 h-5 text-neon-magenta" /> Panel DOCSIS
            </h3>
            <button onClick={load} disabled={loading} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-neon-magenta font-mono border border-slate-700 hover:border-neon-magenta/40 px-3 py-1.5 rounded-lg transition-all">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> ACTUALIZAR
            </button>
          </div>

          {error && <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 font-mono text-sm flex items-center gap-3"><AlertTriangle className="w-5 h-5" /> {error}</div>}
          
          {data && !loading && (
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Columna Izquierda — CMTS y Desglose */}
              <div className="flex-[2] bg-slate-900/60 rounded-xl border border-slate-700/40 p-5 flex flex-col h-full">
                <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                  <span>Equipos CMTS</span>
                  <span className="text-neon-magenta/80 border border-neon-magenta/30 px-2 py-0.5 rounded-full">{data.totalCmts} CMTS</span>
                </p>

                {data.cmts && data.cmts.length > 0 ? (
                  <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 space-y-2 border-t border-slate-800/50 pt-2 custom-scrollbar">
                    {data.cmts.map((cmts: any, idx: number) => {
                      const isExpanded = expandedCmts === cmts.id;
                      return (
                        <div key={idx} className="flex flex-col gap-0.5 mb-2 pb-2 border-b border-slate-800/30 last:border-0 last:mb-0 last:pb-0">
                          <div 
                            className="flex items-center justify-between cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
                            onClick={() => setExpandedCmts(isExpanded ? null : cmts.id)}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="text-[10px] text-slate-400 shrink-0">{isExpanded ? '▼' : '▶'}</span>
                              <span className="text-[10px] font-bold text-slate-200 truncate" title={cmts.detalle}>{cmts.detalle || `CMTS-${cmts.id}`}</span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-700/50">
                              <span className="text-[9px] font-mono text-green-400">On Line: {cmts.modemOnline || 0}</span>
                              <span className="text-[9px] font-mono text-red-500">Off Line: {cmts.modemOffline || 0}</span>
                              <span className="text-[9px] font-mono text-white hidden sm:inline-block">Total: {cmts.totalModems || 0}</span>
                            </div>
                          </div>

                          {/* CMTS Expanded Content */}
                          {isExpanded && cmts.shelves && (
                            <div className="ml-4 mt-2 space-y-3 border-l border-slate-800 pl-2">
                              {cmts.shelves.map((shelf: any, sIdx: number) => (
                                <div key={sIdx} className="flex flex-col gap-1">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-800/50 px-2 py-0.5 rounded-sm inline-block self-start">
                                    Shelf {shelf.shelf}
                                  </div>
                                  <div className="space-y-1.5 mt-1">
                                    {shelf.ports && shelf.ports.map((port: any, pIdx: number) => {
                                      // Asumimos un máximo de 200 CM por puerto para mostrar la barra (aprox)
                                      const maxCmPerPort = 200; 
                                      const occPct = Math.min(100, Math.round(((port.totalModems || 0) / maxCmPerPort) * 100));
                                      let occColor = GREEN;
                                      if (occPct >= 95) occColor = "#ef4444";
                                      else if (occPct >= 80) occColor = YELLOW;
                                      
                                      return (
                                        <div key={pIdx} className="flex flex-row items-center justify-between bg-black/40 rounded p-1.5 border border-slate-800/60 gap-2 flex-wrap sm:flex-nowrap">
                                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                            <span className="text-[9px] font-mono font-bold text-slate-300 w-12">Port {port.port}</span>
                                            <div className="flex items-center gap-2 border-l border-slate-700 pl-2 sm:pl-3">
                                              <span className="text-[9px] font-mono text-green-400">On Line: {port.modemOnline || 0}</span>
                                              <span className="text-[9px] font-mono text-red-500">Off Line: {port.modemOffline || 0}</span>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-2 flex-1 justify-end min-w-[100px] border-l border-slate-700 pl-2 sm:pl-3">
                                            <span className="text-[8px] font-mono text-slate-500 hidden sm:inline-block w-12 text-right">{port.totalModems} CMs</span>
                                            <div className="flex items-center gap-1.5 w-16 sm:w-20 flex-shrink-0">
                                              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{width: `${occPct}%`, backgroundColor: occColor, boxShadow: `0 0 5px ${occColor}80`}} />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center border-t border-slate-800/50 mt-2 min-h-[200px]">
                    <span className="text-slate-600 text-sm font-mono tracking-widest uppercase">Sin datos de CMTS</span>
                  </div>
                )}
              </div>

              {/* Columna Derecha — Resumen */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="bg-slate-900/60 rounded-xl border border-slate-700/40 p-5">
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-4">Métricas Globales</p>
                  <div className="grid grid-cols-1 gap-4">
                    <StatCard label="Modems Total" value={data.totalModems} color={WHITE} />
                    <StatCard label="On Line" value={data.modemOnline || 0} color={GREEN} />
                    <StatCard label="Off Line" value={data.modemOffline || 0} color={RED} />
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
