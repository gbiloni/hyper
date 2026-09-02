"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import UsuarioModal from './UsuarioModal';
import { fetchUsuarios, createUsuario, updateUsuario, deleteUsuario, fetchNodos } from '../services/api';
import { Users, UserPlus, Edit2, Trash2, Shield, User as UserIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function UsuariosPage({ onClose }) {
  const { user, hasRole } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [nodos, setNodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [sortField, setSortField] = useState('username');
  const [sortDir, setSortDir] = useState('asc');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, nodosData] = await Promise.all([fetchUsuarios(), fetchNodos()]);
      setUsuarios(usersData);
      setNodos(nodosData);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (formData) => {
    try {
      if (editingUsuario) {
        await updateUsuario(editingUsuario.id, formData);
      } else {
        await createUsuario(formData);
      }
      setModalOpen(false);
      setEditingUsuario(null);
      fetchData();
    } catch (err) { throw err; }
  };

  const handleDelete = async (usuario) => {
    if (!confirm(`¿Eliminar el usuario "${usuario.username}"?`)) return;
    try {
      await deleteUsuario(usuario.id);
      fetchData();
    } catch (err) { setError(err.message); }
  };

  const handleEdit = (usuario) => { setEditingUsuario(usuario); setModalOpen(true); };
  const handleNew = () => { setEditingUsuario(null); setModalOpen(true); };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = [...usuarios].sort((a, b) => {
    const va = (a[sortField] || '').toLowerCase();
    const vb = (b[sortField] || '').toLowerCase();
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-neon-cyan" /> : <ArrowDown className="w-3 h-3 text-neon-cyan" />;
  };

  const RolBadge = ({ rol }) => rol === 'ADMIN'
    ? <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono font-bold bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/50">{rol}</span>
    : <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/30">{rol === 'VIEWER' ? 'USUARIO' : rol}</span>;

  const StatusBadge = ({ activo }) => activo
    ? <span className="flex items-center gap-1 text-[10px] font-mono text-neon-green"><span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse inline-block"></span>ACTIVO</span>
    : <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500"><span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block"></span>INACTIVO</span>;

  if (!hasRole('ADMIN')) {
    return <div className="p-8 text-neon-magenta font-mono text-center">Acceso denegado: Se requieren privilegios de administrador global.</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[95vh] flex flex-col relative glass-panel rounded-lg border border-neon-cyan/30 shadow-[0_0_30px_rgba(0,243,255,0.15)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan rounded-full mix-blend-screen filter blur-[100px] opacity-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-magenta rounded-full mix-blend-screen filter blur-[100px] opacity-10 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 bg-black/40 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Users className="text-neon-cyan w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
            <div>
              <h2 className="text-base sm:text-xl font-bold text-white tracking-widest font-mono">
                CONTROL DE <span className="text-neon-cyan">ACCESOS</span>
              </h2>
              <p className="hidden sm:block text-xs text-matrix opacity-70 tracking-widest uppercase mt-0.5">Gestión centralizada de usuarios</p>
            </div>
          </div>
          <button className="text-white/50 hover:text-neon-magenta transition-colors p-1 text-2xl leading-none" onClick={onClose}>✕</button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 bg-black/20 border-b border-white/5 relative z-10 shrink-0">
          <div className="flex items-center gap-2 text-neon-cyan text-xs font-mono bg-neon-cyan/10 border border-neon-cyan/30 px-2 py-1 rounded">
            <Shield className="w-3 h-3" />
            <span>{usuarios.length} REGISTROS</span>
          </div>
          <button className="btn-neon text-xs sm:text-sm py-1.5 px-3 sm:px-4 flex items-center gap-1.5" onClick={handleNew}>
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">NUEVO USUARIO</span>
            <span className="sm:hidden">NUEVO</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 relative z-10">
          {error && (
            <div className="mb-3 p-3 rounded bg-red-900/20 border border-neon-magenta text-neon-magenta font-mono text-xs flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
              <span className="text-matrix/50 font-mono text-sm">DESCIFRANDO MATRIZ...</span>
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 text-matrix/50 font-mono text-sm">NO SE ENCONTRARON REGISTROS</div>
          ) : (
            <>
              {/* ══ TABLA — desktop (md+) ══ */}
              <div className="hidden md:block rounded-lg border border-white/10 overflow-hidden bg-black/40">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/60 border-b border-white/10">
                      <th
                        className="p-3 text-xs font-mono text-matrix/70 tracking-wider cursor-pointer hover:text-neon-cyan select-none"
                        onClick={() => handleSort('username')}
                      >
                        <span className="flex items-center gap-1.5">Usuario <SortIcon field="username" /></span>
                      </th>
                      <th
                        className="p-3 text-xs font-mono text-matrix/70 tracking-wider cursor-pointer hover:text-neon-cyan select-none"
                        onClick={() => handleSort('nombre')}
                      >
                        <span className="flex items-center gap-1.5">Nombre <SortIcon field="nombre" /></span>
                      </th>
                      <th className="p-3 text-xs font-mono text-matrix/70 tracking-wider">NIVEL</th>
                      <th className="p-3 text-xs font-mono text-matrix/70 tracking-wider">ESTADO</th>
                      <th className="p-3 text-xs font-mono text-matrix/70 tracking-wider text-right">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sorted.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan shrink-0">
                              <UserIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-mono text-white text-sm">{u.username}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-300">{u.nombre}</td>
                        <td className="p-3"><RolBadge rol={u.rol} /></td>
                        <td className="p-3"><StatusBadge activo={u.activo} /></td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(u)}
                              className="p-1.5 rounded bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 border border-transparent hover:border-neon-cyan/50 transition-all"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {u.id !== user.id && (
                              <button
                                onClick={() => handleDelete(u)}
                                className="p-1.5 rounded bg-neon-magenta/10 text-neon-magenta hover:bg-neon-magenta/20 border border-transparent hover:border-neon-magenta/50 transition-all"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ══ CARDS — mobile (<md) ══ */}
              <div className="md:hidden">
                {/* Sort selector móvil */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => handleSort('username')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border text-xs font-mono transition-all ${sortField === 'username' ? 'border-neon-cyan/60 text-neon-cyan bg-neon-cyan/10' : 'border-white/10 text-gray-500'}`}
                  >
                    <SortIcon field="username" /> Usuario
                  </button>
                  <button
                    onClick={() => handleSort('nombre')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border text-xs font-mono transition-all ${sortField === 'nombre' ? 'border-neon-cyan/60 text-neon-cyan bg-neon-cyan/10' : 'border-white/10 text-gray-500'}`}
                  >
                    <SortIcon field="nombre" /> Nombre
                  </button>
                </div>

                <div className="space-y-2">
                  {sorted.map(u => (
                    <div key={u.id} className="rounded-lg border border-white/10 bg-black/40 p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-white text-sm font-bold truncate max-w-[120px]">{u.username}</span>
                          <RolBadge rol={u.rol} />
                        </div>
                        <div className="text-xs text-gray-400 truncate mt-0.5">{u.nombre}</div>
                        <div className="mt-1"><StatusBadge activo={u.activo} /></div>
                      </div>
                      {/* Botones siempre visibles */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleEdit(u)}
                          className="p-2 rounded bg-neon-cyan/10 text-neon-cyan active:bg-neon-cyan/30 border border-neon-cyan/30"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-2 rounded bg-neon-magenta/10 text-neon-magenta active:bg-neon-magenta/30 border border-neon-magenta/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <UsuarioModal
          usuario={editingUsuario}
          nodos={nodos}
          onClose={() => { setModalOpen(false); setEditingUsuario(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
