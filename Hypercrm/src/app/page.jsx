"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { fetchNodos } from '../services/api';
import UsuariosPage from '../components/UsuariosPage';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ThemeSettingsModal from '../components/ThemeSettingsModal';
import './HomePage.css';

// SVG Icons inline
const IconKey = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const IconPalette = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h3.016C21.606 16.394 22 14.502 22 12c0-5.5-4.5-10-10-10z"/>
  </svg>
);

const IconVPN = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="11" width="20" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconPublic = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconLogout = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export default function HomePage() {
  const { user, loading: authLoading, logout, hasRole } = useAuth();
  const router = useRouter();
  const [nodos, setNodos] = useState([]);
  const [nodosLoading, setNodosLoading] = useState(false);
  const [showUsuarios, setShowUsuarios] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [checkingNodeId, setCheckingNodeId] = useState(null);

  const handleNodeClick = async (nodo) => {
    if (checkingNodeId) return;
    setCheckingNodeId(nodo.id);

    // Construir endpoints a verificar
    const endpoints = [];
    if (nodo.endpoint) {
      endpoints.push(nodo.endpoint);
    }

    console.log("======================================");
    console.log(`🔍 Iniciando verificación de nodo: ${nodo.nombre}`);
    console.log(`📍 Configuración original:`, { endpoint: nodo.endpoint });
    console.log(`🚀 Endpoints generados a probar (en orden):`, endpoints);

    try {
      console.log(`📤 Enviando request a /api/check-node con endpoints:`, endpoints);
      const res = await fetch('/api/check-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoints, token: nodo.token })
      });
      const data = await res.json();
      
      console.log(`📥 Respuesta de /api/check-node:`, data);
      
      if (data.success && data.endpoint) {
        console.log(`✅ Conexión EXITOSA. Endpoint seleccionado: ${data.endpoint}`);
        document.cookie = `hyperisp_active_endpoint=${encodeURIComponent(data.endpoint)}; path=/`;
        document.cookie = `hyperisp_active_token=${encodeURIComponent(nodo.token || '')}; path=/`;
        document.cookie = `hyperisp_active_node_id=${nodo.id}; path=/`;
        document.cookie = `hyperisp_active_node_name=${encodeURIComponent(nodo.nombre || '')}; path=/`;
        // Limpiar cache de búsquedas del nodo anterior para que el nuevo nodo arranque limpio
        try {
          sessionStorage.removeItem('clientes_admin_search');
          sessionStorage.removeItem('clientes_tech_search');
          sessionStorage.removeItem('hyperisp_last_node_id');
        } catch(e) {}
        // Abrir directo al dashboard de la ciudad seleccionada sin pedir login nuevamente
        window.open('/hypercrm/dashboard', '_blank');
      } else {
        console.error(`❌ Falló la conexión a todos los endpoints del nodo.`);
        alert("No se pudo conectar a la API de " + nodo.nombre + " (ni por IP Privada ni Pública).\n\n" + 
              "Detalles del servidor:\n" + 
              (data.logs ? data.logs.join("\n") : "Verifique la consola para más detalles."));
      }
    } catch (e) {
      console.error(`💥 Error catastrófico de red al verificar nodo:`, e);
      alert("Error de red al intentar verificar la conexión del nodo. Ver consola.");
    } finally {
      setCheckingNodeId(null);
    }
  };

  // Solo cargar nodos cuando hay un usuario autenticado
  useEffect(() => {
    if (!user) return;
    setNodosLoading(true);
    fetchNodos()
      .then(data => setNodos(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error al cargar nodos:", err))
      .finally(() => setNodosLoading(false));
  }, [user]);

  const handleLogout = () => {
    logout();
  };

  // Pantalla de carga mientras se verifica el token
  if (authLoading) {
    return (
      <div className="home-page">
        <div className="hero hero--full">
          <div className="hero-grid-bg"></div>
          <div className="hero-content">
            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
            <p className="hero-tagline">VERIFICANDO ACCESO...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* ═══ HEADER ═══ */}
      <header className="public-header">
        <div className="public-header-brand">
          <img src="/hyper.ico" alt="Logo" className="brand-logo" />
          Hyper <span className="accent">CRM</span>
        </div>

        {user && (
          /* ── Header para usuario logueado ── */
          <div className="header-auth-group">
            {hasRole('ADMIN') && (
              <button
                className="btn-header-action"
                onClick={() => setShowUsuarios(true)}
                id="btn-user-management"
                data-tooltip="Gestión de Usuarios"
              >
                <IconUsers />
                <span>Usuarios</span>
              </button>
            )}
            <button
              className="btn-header-action"
              onClick={() => router.push('/admin')}
              id="btn-admin-panel"
              data-tooltip="Administrar Nodos"
            >
              <IconSettings />
              <span>Gestión Nodos</span>
            </button>
            <button
              className="btn-header-action"
              onClick={() => setShowThemeSettings(true)}
              id="btn-theme-settings"
              data-tooltip="Cambiar Tema Visual"
            >
              <IconPalette />
              <span>Tema Visual</span>
            </button>
            <button
              className="btn-header-action"
              onClick={() => setShowChangePassword(true)}
              id="btn-change-password"
              data-tooltip="Cambiar Contraseña"
            >
              <IconKey />
              <span>Clave</span>
            </button>
            <div className="header-user-info">
              <span className="header-username">{user.nombre || user.username}</span>
              <span className="header-role">{user.rol}</span>
            </div>
            <button className="btn-logout" onClick={handleLogout} id="btn-logout" data-tooltip="Cerrar Sesión">
              <IconLogout />
              <span>Salir</span>
            </button>
          </div>
        )}
      </header>

      {/* ═══ HERO ═══ */}
      <section className={`hero ${!user ? 'hero--full' : ''}`}>
        <div className="hero-grid-bg"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            Hyper <span className="accent">CRM</span>
          </h1>
          <p className="hero-tagline">PORTAL OMNICANAL DE GESTIÓN</p>

          {!user && (
            <div className="hero-cta-group">
              <button
                className="btn-hero-login"
                onClick={() => router.push('/login')}
                id="btn-hero-login"
              >
                <span className="btn-hero-glow"></span>
                INGRESAR AL SISTEMA
              </button>
              <p className="hero-hint">
                Acceso exclusivo para operadores autorizados
              </p>
            </div>
          )}

          {user && (
            <div className="hero-welcome">
              <p className="welcome-text">
                Bienvenido, <strong>{user.nombre || user.username}</strong>. 
                Seleccioná una red para acceder a su panel de gestión.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ═══ REDES (solo logueado) ═══ */}
      {user && (
        <section className="nodos-section" id="nodos-section">
          <h2 className="section-heading">
            <span className="heading-diamond"></span>
            Portal de Redes
          </h2>
          <p className="nodos-subtitle">
            Seleccioná tu sucursal o ciudad para acceder al CRM Omnicanal.
          </p>

          {nodosLoading ? (
            <div className="news-loading">
              <div className="loading-spinner"></div>
              <span>Cargando ciudades...</span>
            </div>
          ) : nodos.length === 0 ? (
            <div className="news-empty"><p>No hay ciudades configuradas.</p></div>
          ) : (
            <div className="nodos-list">
              {nodos.map(nodo => (
                <div key={nodo.id} className="nodo-list-item" onClick={() => handleNodeClick(nodo)} style={{ cursor: checkingNodeId ? 'wait' : 'pointer' }}>
                  {checkingNodeId === nodo.id && (
                    <div className="nodo-list-overlay">
                      <div className="loading-spinner"></div>
                      <span className="nodo-list-connecting">CONECTANDO...</span>
                    </div>
                  )}
                  {/* Logo */}
                  <div className="nodo-list-logo-wrap">
                    {nodo.logo_url ? (
                      <img src={nodo.logo_url} alt={`Logo ${nodo.nombre}`} className="nodo-list-logo" />
                    ) : (
                      <div className="nodo-list-logo-placeholder">
                        {nodo.nombre.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="nodo-list-info">
                    <h3 className="nodo-list-nombre">{nodo.nombre}</h3>
                    <p className="nodo-list-hint">ENTRAR AL SISTEMA</p>
                  </div>

                  <div className="nodo-list-arrow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer className="public-footer">
        <div className="footer-line"></div>
        <div className="footer-content">
          <span className="footer-brand">Hyper <span className="accent">CRM</span></span>
          <span className="footer-copy">© {new Date().getFullYear()} Todos los derechos reservados</span>
          {!user && (
            <button className="footer-admin-link" onClick={() => router.push('/login')}>
              Panel de Administración
            </button>
          )}
        </div>
      </footer>

      {/* ═══ MODAL USUARIOS ═══ */}
      {showUsuarios && (
        <UsuariosPage onClose={() => setShowUsuarios(false)} />
      )}
      
      {/* ═══ MODAL CAMBIAR CLAVE ═══ */}
      {showChangePassword && user && (
        <ChangePasswordModal user={user} onClose={() => setShowChangePassword(false)} />
      )}

      {/* ═══ MODAL TEMA VISUAL ═══ */}
      {showThemeSettings && user && (
        <ThemeSettingsModal onClose={() => setShowThemeSettings(false)} />
      )}
    </div>
  );
}
