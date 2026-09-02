"use client";
import { useState, useEffect } from 'react';
import { User, Lock, Mail, Shield, Zap, Save, X, Server } from 'lucide-react';

const ROLES = ['ADMIN', 'VIEWER'];

export default function UsuarioModal({ usuario, nodos, onClose, onSave }) {
  const [form, setForm] = useState({
    username: '',
    password: '',
    nombre: '',
    email: '',
    rol: 'VIEWER',
    activo: 1,
    nodos: []
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (usuario) {
      setForm({
        username: usuario.username || '',
        password: '', // Empty on edit unless they want to change it
        nombre: usuario.nombre || '',
        email: usuario.email || '',
        rol: usuario.rol || 'VIEWER',
        activo: usuario.activo ?? 1,
        nodos: usuario.nodos || []
      });
    }
  }, [usuario]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
    setError('');
  };

  const handleNodoToggle = (nodoId) => {
    setForm(prev => {
      const currentNodos = prev.nodos;
      if (currentNodos.includes(nodoId)) {
        return { ...prev, nodos: currentNodos.filter(id => id !== nodoId) };
      } else {
        return { ...prev, nodos: [...currentNodos, nodoId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.nombre.trim() || (!usuario && !form.password)) {
      setError('Credenciales incompletas: Identificador, clave (para nuevos) y nombre son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || 'Error de sincronización con el núcleo.');
      setSaving(false);
    }
  };

  const isEditing = !!usuario;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div 
        className="w-full max-w-2xl max-h-[95vh] flex flex-col bg-[#0a0a0f] border border-neon-cyan/40 rounded-lg shadow-[0_0_40px_rgba(0,243,255,0.2)] overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan rounded-full mix-blend-screen filter blur-[80px] opacity-20 pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-neon-cyan/20 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neon-cyan/10 rounded border border-neon-cyan/30 text-neon-cyan">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold font-mono text-white tracking-widest uppercase">
              {isEditing ? 'MODIFICAR USUARIO' : 'NUEVO USUARIO'}
            </h3>
          </div>
          <button onClick={onClose} className="text-matrix/50 hover:text-neon-magenta transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10">
          {error && (
            <div className="mb-6 p-4 rounded bg-red-900/20 border border-neon-magenta text-neon-magenta font-mono text-sm shadow-[0_0_10px_var(--neon-magenta)] flex items-start gap-3">
              <span className="text-xl leading-none">⚠</span> 
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Username */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-matrix/70 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3 h-3 text-neon-cyan" /> Identificador
                </label>
                <input 
                  name="username" 
                  value={form.username} 
                  onChange={handleChange} 
                  className="w-full bg-black/50 border border-white/10 rounded px-4 py-2.5 text-white font-mono focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan outline-none transition-all"
                  placeholder="ID Sistema" 
                  autoFocus 
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-matrix/70 uppercase tracking-widest flex items-center gap-2">
                  <Lock className="w-3 h-3 text-neon-cyan" /> Código de Acceso
                </label>
                <input 
                  name="password" 
                  type="password" 
                  value={form.password} 
                  onChange={handleChange} 
                  className="w-full bg-black/50 border border-white/10 rounded px-4 py-2.5 text-white font-mono focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan outline-none transition-all"
                  placeholder={isEditing ? "*** (Mantener intacto)" : "Requerido"} 
                />
              </div>

              {/* Nombre */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-matrix/70 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3 h-3 text-neon-cyan" /> Identidad Real
                </label>
                <input 
                  name="nombre" 
                  value={form.nombre} 
                  onChange={handleChange} 
                  className="w-full bg-black/50 border border-white/10 rounded px-4 py-2.5 text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan outline-none transition-all"
                  placeholder="Nombre y Apellido" 
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-matrix/70 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="w-3 h-3 text-neon-cyan" /> Canal de Com (Email)
                </label>
                <input 
                  name="email" 
                  type="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  className="w-full bg-black/50 border border-white/10 rounded px-4 py-2.5 text-white font-mono focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan outline-none transition-all"
                  placeholder="op@hyper.net" 
                />
              </div>

              {/* Rol */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-mono text-matrix/70 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3 h-3 text-neon-cyan" /> Nivel de Autorización
                </label>
                <select 
                  name="rol" 
                  value={form.rol} 
                  onChange={handleChange}
                  className="w-full bg-black/80 border border-neon-cyan/40 rounded px-4 py-3 text-neon-cyan font-mono font-bold focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan outline-none transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300F3FF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r} className="bg-gray-900">{r === 'ADMIN' ? 'ADMINISTRADOR GLOBAL (ACCESO TOTAL)' : 'USUARIO (RESTRINGIDO POR NODO)'}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Asignación de nodos */}
            {form.rol === 'VIEWER' && (
              <div className="space-y-3 pt-4 border-t border-white/10">
                <label className="text-xs font-mono text-matrix/70 uppercase tracking-widest flex items-center gap-2">
                  <Server className="w-3 h-3 text-neon-cyan" /> Nodos Asignados (Permisos)
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {nodos.length === 0 ? (
                    <div className="col-span-2 text-center text-sm font-mono text-matrix/50 p-4 border border-dashed border-white/10 rounded">
                      NO HAY NODOS REGISTRADOS
                    </div>
                  ) : (
                    nodos.map(nodo => (
                      <label 
                        key={nodo.id} 
                        className={`flex items-center gap-3 p-3 rounded cursor-pointer border transition-all ${
                          form.nodos.includes(nodo.id) 
                            ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan' 
                            : 'bg-black/40 border-white/5 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={form.nodos.includes(nodo.id)} 
                          onChange={() => handleNodoToggle(nodo.id)} 
                        />
                        <div className={`w-4 h-4 rounded-sm flex items-center justify-center border ${form.nodos.includes(nodo.id) ? 'bg-neon-cyan border-neon-cyan' : 'border-gray-600'}`}>
                          {form.nodos.includes(nodo.id) && <span className="text-black text-xs">✓</span>}
                        </div>
                        <span className="font-mono text-sm uppercase tracking-wide truncate">{nodo.nombre}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Activo / Inactivo */}
            <div className="pt-4 flex items-center justify-between border-t border-white/10">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    name="activo" 
                    type="checkbox" 
                    className="sr-only"
                    checked={form.activo === 1} 
                    onChange={handleChange} 
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${form.activo === 1 ? 'bg-neon-green/40 border border-neon-green' : 'bg-gray-800 border border-gray-600'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${form.activo === 1 ? 'translate-x-4 bg-neon-green shadow-[0_0_8px_var(--neon-green)]' : 'bg-gray-400'}`}></div>
                </div>
                <span className={`font-mono text-sm tracking-wide ${form.activo === 1 ? 'text-neon-green' : 'text-gray-500'}`}>
                  {form.activo === 1 ? 'CREDENCIAL ACTIVA' : 'CREDENCIAL SUSPENDIDA'}
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-6 flex justify-end gap-4 border-t border-neon-cyan/20">
              <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-2.5 rounded font-mono text-sm tracking-widest text-matrix hover:text-white hover:bg-white/5 transition-colors"
              >
                ABORTAR
              </button>
              <button 
                type="submit" 
                disabled={saving}
                className="btn-neon px-8 py-2.5 text-sm tracking-widest flex items-center gap-2"
              >
                {saving ? (
                  <span className="animate-pulse">SINCRONIZANDO...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> 
                    {isEditing ? 'ACTUALIZAR' : 'REGISTRAR'}
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
