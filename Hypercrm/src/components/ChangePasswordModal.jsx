"use client";
import { useState } from 'react';
import { changePassword } from '../services/api';
import { Key } from 'lucide-react';

export default function ChangePasswordModal({ user, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Completá todos los campos');
      return;
    }
    if (newPassword.length < 4) {
      setError('La nueva clave debe tener al menos 4 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las claves nuevas no coinciden');
      return;
    }
    if (currentPassword === newPassword) {
      setError('La nueva clave debe ser distinta a la actual');
      return;
    }

    setLoading(true);
    try {
      await changePassword(user.username, currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div 
        className="w-full max-w-md flex flex-col relative glass-panel rounded-lg border border-neon-cyan/30 shadow-[0_0_30px_rgba(0,243,255,0.15)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan rounded-full mix-blend-screen filter blur-[100px] opacity-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-magenta rounded-full mix-blend-screen filter blur-[100px] opacity-10 pointer-events-none"></div>

        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/40 relative z-10">
          <div className="flex items-center gap-3">
            <Key className="text-neon-cyan w-6 h-6" />
            <h2 className="text-lg font-bold text-white tracking-widest font-mono">
              CAMBIAR <span className="text-neon-cyan">CLAVE</span>
            </h2>
          </div>
          <button className="text-white/50 hover:text-neon-magenta transition-colors" onClick={onClose}>
            <span className="text-2xl leading-none">✕</span>
          </button>
        </div>

        <div className="p-6 relative z-10 bg-black/40">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-neon-green/60 bg-neon-green/10 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,102,0.3)]">
                <svg className="w-8 h-8 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-neon-green font-mono font-bold tracking-widest text-lg">CLAVE ACTUALIZADA</h3>
              <p className="text-matrix/70 mt-2 text-sm font-mono">Los cambios se guardaron correctamente.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded bg-red-900/20 border border-neon-magenta text-neon-magenta font-mono text-sm shadow-[0_0_10px_var(--neon-magenta)] text-center">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-mono text-matrix/70 uppercase tracking-wider mb-1.5">CLAVE ACTUAL</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full rounded border border-white/20 bg-black/50 py-2.5 px-3 text-white focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan font-mono"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-mono text-matrix/70 uppercase tracking-wider mb-1.5">NUEVA CLAVE</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full rounded border border-white/20 bg-black/50 py-2.5 px-3 text-white focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-matrix/70 uppercase tracking-wider mb-1.5">CONFIRMAR NUEVA CLAVE</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full rounded border border-white/20 bg-black/50 py-2.5 px-3 text-white focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan font-mono"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 font-mono text-sm tracking-widest rounded border border-white/20 text-white/70 hover:bg-white/5 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-neon px-6 py-2 text-sm tracking-widest disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && (
                    <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {loading ? 'PROCESANDO...' : 'ACTUALIZAR'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
