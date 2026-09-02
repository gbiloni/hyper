"use client";

import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Maximize2, Minimize2 } from "lucide-react";
import ThemeSettingsModal from "../ThemeSettingsModal";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const toggleFullScreen = () => {
    const el = document.documentElement as any;
    const requestFs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;

    if (!isFullScreen) {
      if (requestFs && typeof requestFs === "function") {
        requestFs.call(el)
          .then(() => setIsFullScreen(true))
          .catch(() => {
            setIsFullScreen(true);
            setTimeout(() => window.scrollTo({ top: 80, behavior: "smooth" }), 150);
          });
      } else {
        // En iOS Safari / iPhone donde requestFullscreen no es compatible,
        // al activar FullScreen permitimos el scroll real del window para que
        // Safari oculte su barra superior de dirección automáticamente al hacer scroll down.
        setIsFullScreen(true);
        setTimeout(() => window.scrollTo({ top: 80, behavior: "smooth" }), 150);
      }
    } else {
      const exitFs = document.exitFullscreen || (document as any).webkitExitFullscreen || (document as any).mozCancelFullScreen || (document as any).msExitFullscreen;
      if (exitFs && typeof exitFs === "function" && document.fullscreenElement) {
        exitFs.call(document).then(() => setIsFullScreen(false)).catch(() => setIsFullScreen(false));
      } else {
        setIsFullScreen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  useEffect(() => {
    // Verificar si el usuario necesita cambiar clave (first_login)
    async function checkFirstLogin() {
      try {
        const res = await fetch("/hypercrm/api/auth/session");
        const data = await res.json();
        if (!data.isLoggedIn) {
          window.location.href = "/hypercrm/login";
          return;
        }
        if (data.user?.first_login === true) {
          window.location.href = "/hypercrm/login";
          return;
        }
      } catch (err) {
        console.error("Error verificando sesión:", err);
      }
    }
    checkFirstLogin();
  }, []);

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const res = await fetch("/hypercrm/api/system/info");
        if (res.ok) {
          const json = await res.json();
          const nombre = json?.data?.nombre_empresa || json?.nombre_empresa;
          if (nombre) {
            document.title = `${nombre.trim()} | Hyper CRM`;
          }
        }
      } catch (e) {
        // Silencioso: si falla, queda el título default del metadata
      }
    };
    fetchEmpresa();
  }, []);

  return (
    <div className={`flex w-full bg-background ${isFullScreen ? "min-h-[115vh]" : "h-screen overflow-hidden"}`}>
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} onOpenThemeModal={() => setIsThemeModalOpen(true)} />

      <div className={`flex flex-1 flex-col ${isFullScreen ? "min-h-[115vh]" : "overflow-hidden"}`}>
        {/* Hamburguesa y botón Fullscreen visible en móvil/tablet */}
        <div className="xl:hidden p-3 border-b border-[var(--primary)]/10 flex justify-between items-center bg-background">
          <span className="text-[var(--text-main)] font-bold tracking-widest text-sm">HYPER ISP</span>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleFullScreen}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 border border-[var(--accent)]/60 text-[var(--accent)] font-mono text-xs rounded shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all"
              title="Alternar Pantalla Completa"
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="text-[11px] font-bold">{isFullScreen ? "SALIR" : "FULLSCREEN"}</span>
            </button>
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 ${
          isFullScreen
            ? "w-full min-h-[115vh] bg-background pt-2"
            : "overflow-y-auto"
        }`}>
          {isFullScreen && (
            <div className="flex justify-end mb-2 sticky top-2 z-50">
              <button
                onClick={toggleFullScreen}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/40 border border-red-500 text-red-200 font-mono text-xs rounded-full shadow-lg backdrop-blur-md"
              >
                <Minimize2 className="w-4 h-4" />
                SALIR FULLSCREEN
              </button>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Overlay para cerrar el menú en tablet/móvil */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 xl:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {isThemeModalOpen && (
        <ThemeSettingsModal onClose={() => setIsThemeModalOpen(false)} />
      )}
    </div>
  );
}

