"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { LogIn, LogOut, Building2 } from "lucide-react";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sysName, setSysName] = useState("");
  const [sysLogo, setSysLogo] = useState("");

  useEffect(() => {
    // Verificar sesión segura contra la API
    async function checkSession() {
      try {
        const res = await fetch("/hyperisp/api/auth/session");
        const data = await res.json();
        setIsLoggedIn(data.isLoggedIn);

        // Si está logueado pero necesita cambiar clave → redirigir al login
        if (data.isLoggedIn && data.user?.first_login === true) {
          window.location.href = "/login";
          return;
        }
      } catch (err) {
        console.error("Error comprobando sesión", err);
      }
    }
    checkSession();

    // Obtener nombre y logo de la empresa
    async function fetchSysInfo() {
      try {
        const res = await fetch("/hyperisp/api/system/info");
        const data = await res.json();
        
        console.log("=== DEBUG FRONTEND ===");
        console.log("Respuesta OK?:", res.ok);
        console.log("Datos recibidos:", data);

        // Cumpliendo con las normas de compatibilidad del frontend
        if (res.ok && data.success && data.data) {
          console.log("Seteando nombre y logo...");
          if (data.data.nombre_empresa) {
            setSysName(data.data.nombre_empresa);
            document.title = `${data.data.nombre_empresa.trim()} | Hyper CRM`;
          }
          if (data.data.logo_empresa) setSysLogo(data.data.logo_empresa);
        } else {
          console.log("Falló la condición de res.ok && data.success && data.data");
        }
      } catch (err) {
        console.error("Error al cargar info de la empresa", err);
      }
    }
    fetchSysInfo();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/hyperisp/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    setIsLoggedIn(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1b2a 50%, #0a0a0f 100%)',
      color: '#e2e8f0',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>

      <style>{`
        .btn-session {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.5rem 1.5rem;
          border-radius: 4px;
          text-decoration: none;
          font-size: 0.8rem; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: all 0.2s ease; background: transparent;
          cursor: pointer;
        }
        .btn-login {
          border: 1px solid #00ff41; color: #00ff41;
        }
        .btn-login:hover { background: #00ff41; color: #0a0a0f; box-shadow: 0 0 20px rgba(0,255,65,0.4); }
        .btn-logout {
          border: 1px solid #ff4444; color: #ff4444;
        }
        .btn-logout:hover { background: #ff4444; color: #0a0a0f; box-shadow: 0 0 20px rgba(255,68,68,0.4); }
        .btn-enter {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.85rem 2.5rem;
          border: 1px solid #00ff41; border-radius: 4px;
          color: #00ff41; text-decoration: none;
          font-size: 0.85rem; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          transition: all 0.2s ease; background: transparent;
        }
        .btn-enter:hover { background: #00ff41; color: #0a0a0f; box-shadow: 0 0 25px rgba(0,255,65,0.5); }

        .info-card {
          background: rgba(15,23,42,0.7);
          border-radius: 8px; padding: 1.5rem;
          backdrop-filter: blur(8px);
          transition: box-shadow 0.2s ease;
        }
        .info-card:hover { box-shadow: 0 0 20px rgba(0,243,255,0.1); }
      `}</style>

      {/* Glow effects */}
      <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(149,0,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-100px', right: '-100px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0,255,65,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* HEADER */}
      <header style={{ borderBottom: '1px solid rgba(149,0,255,0.3)', background: 'rgba(13,27,42,0.8)', backdropFilter: 'blur(10px)', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1rem' }}>

          {/* IZQUIERDA — Logo de la plataforma + nombre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/hyper.ico"
              alt=""
              style={{ height: '36px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(149,0,255,0.5))' }}
            />
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#8702e6ff', textShadow: '0 0 10px rgba(149,0,255,0.7)' }}>Hyper</span>
              {' '}
              <span style={{ color: '#01fc40ff', textShadow: '0 0 10px rgba(0,255,65,0.7)' }}>CRM</span>
            </h1>
          </div>

          {/* CENTRO — Logo y nombre de la empresa (desde la BD) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
            {isLoggedIn ? (
              <Link href="/hyperisp/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', cursor: 'pointer' }}>
                {sysLogo && (
                  <img
                    src={sysLogo}
                    alt={sysName}
                    style={{ height: '40px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(149,0,255,0.4))', transition: 'transform 0.2s', ...{ ':hover': { transform: 'scale(1.05)' } } as any }}
                  />
                )}
                {sysName && (
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {sysName}
                  </span>
                )}
              </Link>
            ) : (
              <>
                {sysLogo && (
                  <img
                    src={sysLogo}
                    alt={sysName}
                    style={{ height: '40px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(149,0,255,0.4))' }}
                  />
                )}
                {sysName && (
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {sysName}
                  </span>
                )}
              </>
            )}
          </div>

          {/* DERECHA — Login / Logout */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {isLoggedIn ? (
              <button onClick={handleLogout} className="btn-session btn-logout">
                <LogOut style={{ width: '16px', height: '16px' }} />
                Cerrar Sesión
              </button>
            ) : (
              <Link href="/login" className="btn-session btn-login">
                <LogIn style={{ width: '16px', height: '16px' }} />
                Iniciar Sesión
              </Link>
            )}
          </div>

        </div>
      </header>


      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', position: 'relative', zIndex: 10 }}>

        {/* Hero */}
        <div style={{
          background: 'rgba(15,23,42,0.75)', 
          border: isLoggedIn ? '1px solid rgba(149,0,255,0.2)' : '1px solid rgba(255,68,68,0.4)',
          borderRadius: '12px', backdropFilter: 'blur(10px)',
          padding: '3rem 2rem', maxWidth: '900px', width: '100%',
          textAlign: 'center', 
          boxShadow: isLoggedIn ? '0 0 40px rgba(0,0,0,0.5)' : '0 0 40px rgba(255,68,68,0.15)',
          transition: 'all 0.3s ease'
        }}>
          {/* Logo grande central */}
          {sysLogo ? (
            isLoggedIn ? (
              <Link href="/hyperisp/dashboard" style={{ display: 'block', margin: '0 auto 1.5rem', width: 'fit-content', cursor: 'pointer' }}>
                <img src={sysLogo} alt={sysName} style={{ height: '80px', width: 'auto', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 0 15px rgba(149,0,255,0.3))' }} />
              </Link>
            ) : (
              <img src={sysLogo} alt={sysName} style={{ height: '80px', width: 'auto', objectFit: 'contain', margin: '0 auto 1.5rem', display: 'block', filter: 'drop-shadow(0 0 15px rgba(255,68,68,0.3))' }} />
            )
          ) : (
            isLoggedIn ? (
              <Link href="/hyperisp/dashboard" style={{ display: 'block', margin: '0 auto 1.5rem', width: 'fit-content', cursor: 'pointer' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '1px solid rgba(149,0,255,0.3)', background: 'rgba(149,0,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 style={{ width: '36px', height: '36px', color: '#9500ff', opacity: 0.7 }} />
                </div>
              </Link>
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '1px solid rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Building2 style={{ width: '36px', height: '36px', color: '#ff4444', opacity: 0.7 }} />
              </div>
            )
          )}

          {/* Nombre de la empresa */}
          {sysName && (
            <p style={{ fontSize: '1rem', color: isLoggedIn ? '#94a3b8' : '#ff4444', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '0', transition: 'color 0.3s ease' }}>
              {sysName} {isLoggedIn ? '' : '- REQUIERE AUTENTICACIÓN'}
            </p>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(149,0,255,0.1)', padding: '1.5rem', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', letterSpacing: '0.1em' }}>
          © 2026 - HyperCRM — Plataforma Centralizada Omnicanal
        </p>
      </footer>
    </div>
  );
}
