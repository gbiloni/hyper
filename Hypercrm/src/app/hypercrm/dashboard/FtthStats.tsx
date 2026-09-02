"use client";

import { useState, useEffect } from "react";
import { getFtthStats } from "./actions";
import { Activity, Wifi, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const CYAN = "#00f3ff";
const PURPLE = "#ff00ea";
const GREEN = "#00ff9d";
const YELLOW = "#ffee00";
const RED = "#ff3333";
const WHITE = "#ffffff";
const SLATE = "#334155";

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function StatCard({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center p-4 rounded-xl border bg-black/50 backdrop-blur-sm"
      style={{ borderColor: `${color}30`, boxShadow: `0 0 15px ${color}15` }}
    >
      <span className="text-3xl font-black font-mono" style={{ color, textShadow: `0 0 15px ${color}` }}>{value}</span>
      <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-mono">{label}</span>
      {sub && <span className="text-[9px] text-slate-600 mt-0.5">{sub}</span>}
    </div>
  );
}



export default function FtthStats({ onHasData }: { onHasData?: (v: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedOlt, setExpandedOlt] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await getFtthStats();
    if (res.error) {
      setError(res.error);
      onHasData?.(false);
    } else {
      setData(res.data);
      onHasData?.(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Carga inicial para saber si hay datos
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si no hay datos y no está abierto, no renderizar nada
  if (!loading && !data && !error) return null;
  if (!loading && data && data.totalOlts === 0) return null;
  if (error && !open) {
    return (
      <div className="col-span-full bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 font-mono text-sm">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span>FTTH: {error}</span>
      </div>
    );
  }

  const pieData = data ? [
    { name: "Online", value: data.onuOnline, fill: GREEN },
    { name: "Offline", value: data.onuOffline, fill: PURPLE }
  ] : [];

  return (
    <div className="col-span-full relative z-10">
      {/* ── Trigger card ── */}
      <button
        onClick={() => { setOpen(o => !o); if (!data) load(); }}
        className="w-full flex items-center justify-between p-5 rounded-2xl border border-neon-cyan/30 bg-black/50 backdrop-blur-md hover:bg-neon-cyan/5 hover:border-neon-cyan/60 transition-all shadow-[0_0_20px_rgba(0,243,255,0.08)] group"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30">
            <Activity className="w-6 h-6 text-neon-cyan drop-shadow-[0_0_8px_var(--neon-cyan)]" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white tracking-widest uppercase">
              FTTH / Fibra Óptica
              {data && (
                <span className="ml-3 text-[10px] font-mono text-neon-cyan/80 border border-neon-cyan/30 px-2 py-0.5 rounded-full">
                  {data.totalOnus} Ports
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {loading && <RefreshCw className="w-4 h-4 text-neon-cyan animate-spin" />}
          <span className={`text-slate-400 text-xl transition-transform duration-300 ${open ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>

      {/* ── Panel expandible ── */}
      {open && (
        <div className="mt-3 rounded-2xl border border-neon-cyan/20 bg-black/60 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(0,243,255,0.1)] space-y-6">

          {/* Header del panel */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-widest uppercase flex items-center gap-2">
              <Wifi className="w-5 h-5 text-neon-cyan" /> Panel FTTH — Red de Fibra Óptica
            </h3>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-neon-cyan font-mono border border-slate-700 hover:border-neon-cyan/40 px-3 py-1.5 rounded-lg transition-all">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> ACTUALIZAR
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-neon-cyan font-mono text-sm animate-pulse">
              <RefreshCw className="w-5 h-5 animate-spin" /> CONSULTANDO RED ÓPTICA...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 font-mono text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" /> {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* ── Stat cards ── */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col p-4 rounded-xl border bg-black/50 backdrop-blur-sm relative overflow-hidden group" style={{ borderColor: `${CYAN}30`, boxShadow: `0 0 15px ${CYAN}15` }}>
                  <div className="flex flex-col items-center justify-center mb-2">
                    <span className="text-3xl font-black font-mono" style={{ color: CYAN, textShadow: `0 0 15px ${CYAN}` }}>{data.totalOlts}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-mono">OLTs</span>
                  </div>
                  {data.olts && data.olts.length > 0 && (
                    <div className="flex-1 overflow-y-auto max-h-64 pr-1 mt-2 space-y-2 border-t border-slate-800/50 pt-2 custom-scrollbar">
                      {data.olts.map((olt: any, idx: number) => {
                        const isExpanded = expandedOlt === olt.id;
                        
                        return (
                          <div key={idx} className="flex flex-col gap-0.5 mb-2 pb-2 border-b border-slate-800/30 last:border-0 last:mb-0 last:pb-0">
                            <div 
                              className="flex items-center justify-between cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
                              onClick={() => setExpandedOlt(isExpanded ? null : olt.id)}
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="text-[10px] text-slate-400 shrink-0">{isExpanded ? '▼' : '▶'}</span>
                                <span className="text-[10px] font-bold text-slate-200 truncate" title={olt.detalle}>{olt.detalle || `OLT-${olt.id}`}</span>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 shrink-0 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-700/50">
                                <span className="text-[9px] font-mono text-green-400" title="Online">On Line: {olt.onuOnline || 0}</span>
                                <span className="text-[9px] font-mono text-red-500" title="Offline">Off Line: {olt.onuOffline || 0}</span>
                                <span className="text-[9px] font-mono text-white hidden sm:inline-block" title="Libres">LIBRES: {(olt.totalOnus || 0) - (olt.onuOnline || 0) - (olt.onuOffline || 0)}</span>
                              </div>
                            </div>

                            {/* OLT Expanded Content */}
                            {isExpanded && olt.shelves && (
                              <div className="ml-4 mt-2 space-y-3 border-l border-slate-800 pl-2">
                                {olt.shelves.map((shelf: any, sIdx: number) => (
                                  <div key={sIdx} className="flex flex-col gap-1">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-800/50 px-2 py-0.5 rounded-sm inline-block self-start">
                                      Shelf {shelf.shelf}
                                    </div>
                                    <div className="space-y-1.5 mt-1">
                                      {shelf.pons && shelf.pons.map((pon: any, pIdx: number) => {
                                        const ponCapacity = pon.totalOnus || 64; // Capacidad total del PON
                                        const ponActive = (pon.onuOnline || 0) + (pon.onuOffline || 0); // ONUs provisionadas
                                        const occPct = Math.min(100, Math.round((ponActive / ponCapacity) * 100));
                                        
                                        let occColor = GREEN;
                                        if (occPct >= 95) occColor = "#ef4444"; // red
                                        else if (occPct >= 80) occColor = YELLOW; // yellow
                                        
                                        return (
                                          <div key={pIdx} className="flex flex-row items-center justify-between bg-black/40 rounded p-1.5 border border-slate-800/60 gap-2 flex-wrap sm:flex-nowrap">
                                            {/* Info de PON y ONUs */}
                                            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                              <span className="text-[9px] font-mono font-bold text-slate-300 w-10">PON {pon.pon}</span>
                                              <div className="flex items-center gap-2 border-l border-slate-700 pl-2 sm:pl-3">
                                                <span className="text-[9px] font-mono text-green-400">On Line: {pon.onuOnline || 0}</span>
                                                <span className="text-[9px] font-mono text-red-500">Off Line: {pon.onuOffline || 0}</span>
                                              </div>
                                            </div>
                                            
                                            {/* Barra de progreso */}
                                            <div className="flex items-center gap-2 flex-1 justify-end min-w-[100px] border-l border-slate-700 pl-2 sm:pl-3">
                                              <span className="text-[8px] font-mono text-slate-500 hidden sm:inline-block w-12 text-right">{ponActive}/{ponCapacity}</span>
                                              <div className="flex items-center gap-1.5 w-16 sm:w-20 flex-shrink-0">
                                                <span className="text-[9px] font-mono font-bold w-6 text-right" style={{color: occColor}}>{occPct}%</span>
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
                  )}
                </div>
              </div>


            </>
          )}
        </div>
      )}
    </div>
  );
}
