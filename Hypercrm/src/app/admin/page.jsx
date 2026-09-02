"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import AdminTable from '../../components/AdminTable';
import UsuariosPage from '../../components/UsuariosPage';

export default function NodosPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showUsuarios, setShowUsuarios] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="admin-main" style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-color-main)' }}>
      {/* Nuevo Header (Reemplaza al AdminLayout) */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid var(--border-color)', 
        paddingBottom: '1rem',
        marginBottom: '2rem'
      }}>
        <div 
          className="brand" 
          style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
          onClick={() => router.push('/')}
          title="Volver a la página principal"
        >
          <div style={{ fontFamily: 'var(--font-family-display)', fontSize: '1.5rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/hyper.ico" alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            Hyper <span style={{ color: 'var(--neon-cyan)' }}>ISP</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Panel de Administración</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => router.push('/')} 
            style={{ 
              background: 'transparent',
              border: '1px solid rgba(139, 121, 165, 0.3)',
              color: 'var(--text-light)',
              padding: '6px 14px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'var(--font-family-display)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--neon-cyan)'; e.currentTarget.style.color = 'var(--neon-cyan)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 121, 165, 0.3)'; e.currentTarget.style.color = 'var(--text-light)'; }}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>←</span> Volver
          </button>

          <button 
            onClick={() => setShowUsuarios(true)} 
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            Gestión de Usuarios
          </button>
          <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#fff' }}>{user?.nombre || 'Usuario'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--neon-pink)' }}>{user?.rol || 'ADMIN'}</div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ 
              background: 'transparent', 
              border: '1px solid var(--neon-pink)', 
              color: 'var(--neon-pink)', 
              padding: '6px 12px', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'var(--font-family-display)'
            }}
          >
            Salir
          </button>
        </div>
      </header>

      <h1 style={{
        fontFamily: 'var(--font-family-display)',
        fontSize: '1.8rem',
        color: 'var(--text-primary)',
        letterSpacing: '1px',
        margin: '0 0 1.5rem'
      }}>
        Gestión de Nodos
      </h1>
      
      <AdminTable />

      {/* Modal de Usuarios */}
      {showUsuarios && (
        <UsuariosPage onClose={() => setShowUsuarios(false)} />
      )}
    </div>
  );
}
