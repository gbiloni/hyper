"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../services/api';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Change Password State
  const [requireChangePassword, setRequireChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Ingrese usuario y contraseña');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await login(username, password);
      if (data && data.user && data.user.first_login) {
        setRequireChangePassword(true);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err.message || 'Error en login');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setError('La clave debe tener al menos 4 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las claves no coinciden');
      return;
    }
    if (newPassword === password) {
      setError('La nueva clave no puede ser igual a la actual');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await changePassword(username, password, newPassword);
      // Tras cambiar la clave exitosamente, hacemos login de nuevo y pasamos
      await login(username, newPassword);
      router.push('/');
    } catch (err) {
      setError(err.message || 'Error al cambiar la clave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid"></div>
      
      {!requireChangePassword ? (
        <div className="login-card" onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}>
          <div className="login-logo">
            <img src="/hyper.ico" alt="Logo" className="login-brand-logo" />
            <h1>Hyper <span className="accent">CRM</span></h1>
            <p className="login-subtitle">ACCESO AL SISTEMA</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label>USUARIO</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ingrese su usuario"
              autoFocus
            />
          </div>

          <div className="login-field">
            <label>CONTRASEÑA</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
            />
          </div>

          <button type="button" onClick={handleSubmit} className="login-btn" disabled={loading}>
            {loading ? 'VERIFICANDO...' : 'INGRESAR'}
          </button>

          <div className="login-footer">
            SISTEMA PROTEGIDO // ACCESO RESTRINGIDO
          </div>
        </div>
      ) : (
        <div className="login-card" onKeyDown={e => e.key === 'Enter' && handleChangePassword(e)}>
          <div className="login-logo">
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              border: '2px solid rgba(255,0,128,0.6)', background: 'rgba(255,0,128,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem', boxShadow: '0 0 20px rgba(255,0,128,0.3)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff0080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h1 style={{color: '#ff0080', textShadow: '0 0 10px rgba(255,0,128,0.7)', fontSize: '1.2rem', marginBottom: '0.5rem'}}>CAMBIO OBLIGATORIO</h1>
            <p className="login-subtitle" style={{lineHeight: '1.4'}}>Es tu primer inicio de sesión. Por seguridad,<br/>debés establecer una nueva clave.</p>
          </div>

          {error && <div className="login-error" style={{borderColor: '#ff0080', color: '#ff0080'}}>{error}</div>}

          <div className="login-field">
            <label style={{color: '#00f3ff'}}>NUEVA CONTRASEÑA</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Ingrese nueva clave"
              autoFocus
              style={{borderColor: 'rgba(0,243,255,0.4)'}}
            />
          </div>

          <div className="login-field">
            <label style={{color: '#00f3ff'}}>CONFIRMAR CONTRASEÑA</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirme nueva clave"
              style={{borderColor: 'rgba(0,243,255,0.4)'}}
            />
          </div>

          <button type="button" onClick={handleChangePassword} className="login-btn" disabled={loading} style={{
            background: 'rgba(255,0,128,0.1)',
            borderColor: '#ff0080',
            color: '#ff0080',
            boxShadow: 'none'
          }}>
            {loading ? 'ACTUALIZANDO...' : 'ESTABLECER NUEVA CLAVE'}
          </button>
        </div>
      )}
    </div>
  );
}

