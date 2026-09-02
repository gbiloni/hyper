"use client";

import React from "react";
import Link from "next/link";
import { HardHat, Wrench, Cable, Zap, ShieldAlert, Cpu, Activity } from "lucide-react";

export default function SettingsConstruccion() {
  return (
    <div className="flex-1 h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background Grid & Scanline Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.1)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]/20 shadow-[0_0_20px_var(--glow-primary)] animate-pulse"></div>

      {/* Main Glass Panel */}
      <div className="relative z-10 max-w-4xl w-full bg-background-panel border border-[var(--primary)]/50 p-12 rounded-3xl backdrop-blur-xl shadow-[0_0_50px_rgba(var(--primary-rgb),0.15)] overflow-hidden">

        {/* Animated Corner Brackets */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[var(--primary)]/50 rounded-tl-3xl"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--primary)]/50 rounded-tr-3xl"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[var(--primary)]/50 rounded-bl-3xl"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[var(--primary)]/50 rounded-br-3xl"></div>

        {/* Construction Scene */}
        <div className="flex flex-col items-center text-center space-y-8">

          {/* Animated Icons Group */}
          <div className="relative flex items-center justify-center h-40 w-full mb-8">
            {/* Center Node */}
            <div className="absolute z-20 flex items-center justify-center w-24 h-24 bg-[var(--primary)]/10 border border-[var(--primary)] rounded-full shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] animate-pulse">
              <ShieldAlert className="w-12 h-12 text-[var(--primary)]" />
            </div>

            {/* Spinning Orbit 1 */}
            <div className="absolute w-48 h-48 border border-dashed border-[var(--accent)]/30 rounded-full animate-[spin_10s_linear_infinite]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-background p-2 rounded-full border border-[var(--accent)] shadow-[0_0_15px_rgba(var(--accent-rgb),0.6)]">
                <HardHat className="w-6 h-6 text-[var(--accent)]" />
              </div>
            </div>

            {/* Spinning Orbit 2 */}
            <div className="absolute w-64 h-64 border border-dashed border-[var(--cta)]/30 rounded-full animate-[spin_15s_linear_infinite_reverse]">
              <div className="absolute top-1/2 -right-4 -translate-y-1/2 bg-background p-2 rounded-full border border-[var(--cta)] shadow-[0_0_15px_rgba(var(--cta-rgb),0.6)]">
                <Wrench className="w-6 h-6 text-[var(--cta)]" />
              </div>
              <div className="absolute top-1/2 -left-4 -translate-y-1/2 bg-background p-2 rounded-full border border-[var(--cta)] shadow-[0_0_15px_rgba(var(--cta-rgb),0.6)]">
                <Cable className="w-6 h-6 text-[var(--cta)]" />
              </div>
            </div>

            {/* Background Glow */}
            <div className="absolute w-full h-full bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent blur-xl"></div>
          </div>

          {/* Text Content */}
          <div className="space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--cta)]/50 bg-[var(--cta)]/10 text-[var(--cta)] text-xs font-mono font-bold tracking-widest mb-2 shadow-[0_0_10px_rgba(var(--cta-rgb),0.2)]">
              <Zap className="w-4 h-4 animate-pulse" />
              SISTEMA EN DESARROLLO
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-main)] tracking-widest uppercase">Módulo de Configuraciones</h2>
            <p className="text-[var(--text-muted)] font-mono text-sm max-w-2xl mx-auto leading-relaxed">
              Sitio en construcción. Este módulo estará disponible en la próxima actualización del sistema.
            </p>
          </div>

          {/* Progress / Status Bar */}
          <div className="w-full max-w-md bg-background border border-[var(--primary)]/20 rounded-lg p-4 mt-8">
            <div className="flex justify-between items-center mb-2 font-mono text-[10px] text-[var(--accent)]">
              <span className="flex items-center gap-2"><Cpu className="w-3 h-3" /> COMPILANDO MÓDULO</span>
              <span>73%</span>
            </div>
            <div className="w-full h-1.5 bg-background-panel rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] w-[73%] shadow-[0_0_10px_rgba(var(--accent-rgb),0.8)] animate-pulse"></div>
            </div>
            <div className="flex justify-between items-center mt-3 font-mono text-[9px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-[var(--primary)]" /> CONEXIÓN ESTABLE</span>
              <span>ESPERANDO DESPLIEGUE...</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-8">
            <Link
              href="/hyperisp/dashboard"
              className="inline-flex items-center justify-center px-8 py-3 bg-transparent border border-[var(--accent)] text-[var(--accent)] font-bold font-mono tracking-widest hover:bg-[var(--accent)]/20 transition-all shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--accent-rgb),0.6)]"
            >
              VOLVER AL DASHBOARD
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
