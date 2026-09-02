"use client";

import { useState, useEffect } from "react";
import { getEocStats } from "./actions";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { Zap, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const GREEN  = "#00ff9d";
const YELLOW = "#ffee00";
const PURPLE = "#ff00ea";
const CYAN   = "#00f3ff";

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl border bg-black/50 backdrop-blur-sm" style={{ borderColor: `${color}30`, boxShadow: `0 0 15px ${color}15` }}>
      <span className="text-3xl font-black font-mono" style={{ color, textShadow: `0 0 15px ${color}` }}>{value}</span>
      <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-mono">{label}</span>
    </div>
  );
}

export default function EocStats() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await getEocStats();
    if (res.error) setError(res.error);
    else setData(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (!loading && !data && !error) return null;
  if (!loading && data && (data.totalNodos === 0 && data.totalMasters === 0)) return null;

  return (
    <div className="col-span-full relative z-10">
      <button onClick={() => { setOpen(o => !o); if (!data) load(); }} className="w-full flex items-center justify-between p-5 rounded-2xl border border-yellow-400/30 bg-black/50 backdrop-blur-md hover:bg-yellow-400/5 hover:border-yellow-400/60 transition-all shadow-[0_0_20px_rgba(250,204,21,0.08)] group">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30">
            <Zap className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white tracking-widest uppercase">EoC (Ethernet over Coax)</div>
            <div className="text-[11px] text-slate-500 font-mono tracking-wider">Nodo → Master → Slave (MAC)</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {loading && <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />}
          <span className={`text-slate-400 text-xl transition-transform duration-300 ${open ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-yellow-400/20 bg-black/60 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(250,204,21,0.1)] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-widest uppercase flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" /> Panel EoC
            </h3>
            <button onClick={load} disabled={loading} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-yellow-400 font-mono border border-slate-700 hover:border-yellow-400/40 px-3 py-1.5 rounded-lg transition-all">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> ACTUALIZAR
            </button>
          </div>

          {error && <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 font-mono text-sm flex items-center gap-3"><AlertTriangle className="w-5 h-5" /> {error}</div>}
          
          {data && !loading && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Nodos" value={data.totalNodos} color={"#ffffff"} />
                <StatCard label="Masters" value={data.totalMasters} color={"#ffffff"} />
                <StatCard label="Slaves Total" value={data.totalSlaves} color={"#ffffff"} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
