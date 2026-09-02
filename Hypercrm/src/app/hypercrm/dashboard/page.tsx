"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, MessageSquare, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [nodos, setNodos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Volvemos a pedir las ciudades para mostrarlas de forma informativa
    // (sin usarlas como login obligatorio)
    fetch('/api/nodos')
      .then(res => res.json())
      .then(data => setNodos(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error al cargar nodos:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full p-6 md:p-10 space-y-8 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-magenta/5 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none" />

      {/* ─── HERO / BRANDING ─── */}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 bg-background-panel/60 border border-[var(--primary)]/20 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(var(--accent-rgb),0.1)]">
        {/* Logo */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-neon-cyan/20 blur-2xl scale-125 pointer-events-none" />
          <img
            src="/hyper.ico"
            alt="HyperCRM Logo"
            className="h-16 w-auto object-contain filter drop-shadow-[0_0_8px_var(--neon-cyan)] transition-transform duration-300 hover:scale-105"
          />
        </div>

        {/* Title block */}
        <div className="flex flex-col justify-center text-center md:text-left">
          <h1 className="m-0 text-3xl font-extrabold tracking-widest text-[var(--foreground)] uppercase leading-none font-mono">
            Hyper
            {' '}
            <span className="text-[var(--neon-cyan)] drop-shadow-[0_0_20px_var(--neon-cyan)]">CRM</span>
          </h1>
          <p className="text-xs md:text-sm text-matrix font-mono tracking-[0.3em] uppercase mt-2 opacity-80">
            PORTAL OMNICANAL DE GESTIÓN
          </p>
        </div>
      </div>

      {/* ─── CIUDADES ASIGNADAS ─── */}
      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3 border-b border-[var(--primary)]/30 pb-4">
          <MapPin className="w-8 h-8 text-[var(--accent)] drop-shadow-[0_0_8px_var(--accent)]" />
          <h2 className="text-2xl font-bold font-mono tracking-wider text-[var(--foreground)]">Mis Ciudades Habilitadas</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="w-12 h-12 border-4 border-[var(--primary)]/30 border-t-[var(--accent)] rounded-full animate-spin shadow-[0_0_15px_var(--accent)]" />
            <p className="text-[var(--text-muted)] font-mono animate-pulse">Obteniendo sucursales...</p>
          </div>
        ) : nodos.length === 0 ? (
          <div className="bg-background-panel/80 border border-red-500/30 p-8 rounded-xl text-center backdrop-blur-md">
            <p className="text-red-400 font-mono tracking-wide text-lg">No tenés ninguna ciudad o nodo asignado.</p>
            <p className="text-[var(--text-muted)] text-sm mt-2">Contactá al administrador para que te asigne permisos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nodos.map((nodo: any) => (
              <div
                key={nodo.id}
                className="group relative flex flex-col items-center justify-center p-8 bg-slate-900/60 rounded-xl border border-slate-700/50 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-[var(--neon-cyan)] shadow-lg hover:shadow-[0_0_30px_rgba(14,165,233,0.3)] text-left"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none bg-[var(--neon-cyan)]" />
                
                <div className="flex flex-col items-center space-y-4 z-10 w-full">
                  {nodo.logo_url ? (
                    <img src={nodo.logo_url} alt={nodo.nombre} className="h-16 w-auto object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[var(--primary)]/20 border border-[var(--primary)]/40 flex items-center justify-center text-2xl font-bold text-[var(--accent)]">
                      {nodo.nombre.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <h3 className="text-xl font-bold text-[var(--text-main)] font-mono uppercase tracking-widest group-hover:text-[var(--neon-cyan)] transition-colors">
                    {nodo.nombre}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-mono opacity-60">ID Nodo: {nodo.id}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── QUICK LINKS ─── */}
      <div className="relative z-10 space-y-6 mt-12">
        <div className="flex items-center gap-3 border-b border-[var(--primary)]/30 pb-4">
          <MessageSquare className="w-8 h-8 text-[var(--accent)] drop-shadow-[0_0_8px_var(--accent)]" />
          <h2 className="text-2xl font-bold font-mono tracking-wider text-[var(--foreground)]">Accesos Rápidos</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={() => router.push('/hypercrm/soporte')}
            className="group relative flex flex-col items-start p-8 bg-slate-900/60 rounded-xl border border-slate-700/50 backdrop-blur-md overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:border-[var(--neon-cyan)] shadow-lg hover:shadow-[0_0_30px_rgba(14,165,233,0.3)] text-left"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none bg-[var(--neon-cyan)]" />
            <MessageSquare className="w-10 h-10 text-[var(--neon-cyan)] mb-4" />
            <h3 className="text-xl font-bold text-[var(--text-main)] font-mono uppercase tracking-widest group-hover:text-[var(--neon-cyan)] transition-colors">
              Bandeja Omnicanal
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-2">Gestioná y respondé todos los mensajes de WhatsApp, Telegram y Redes desde un solo lugar.</p>
            <div className="flex items-center gap-2 mt-6 text-[var(--neon-cyan)] text-sm font-bold uppercase tracking-widest">
              Abrir <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
            </div>
          </button>

          <button
            onClick={() => router.push('/hypercrm/numeros')}
            className="group relative flex flex-col items-start p-8 bg-slate-900/60 rounded-xl border border-slate-700/50 backdrop-blur-md overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:border-[var(--primary)] shadow-lg hover:shadow-[0_0_30px_rgba(149,0,255,0.3)] text-left"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none bg-[var(--primary)]" />
            <MapPin className="w-10 h-10 text-[var(--primary)] mb-4" />
            <h3 className="text-xl font-bold text-[var(--text-main)] font-mono uppercase tracking-widest group-hover:text-[var(--primary)] transition-colors">
              Canales / Números
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-2">Administrá qué número de WhatsApp o Bot de Telegram pertenece a qué sucursal.</p>
            <div className="flex items-center gap-2 mt-6 text-[var(--primary)] text-sm font-bold uppercase tracking-widest">
              Configurar <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
