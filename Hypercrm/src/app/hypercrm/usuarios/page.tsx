"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Shield, Key, Wrench, Mail, Phone, Edit2, Trash2, Plus, Loader2, Search, Tag, Cpu, Lock, ArrowLeft } from 'lucide-react';

export default function UsuariosRolesPage() {
  const router = useRouter();
  // Autenticación Administrativa
  const [autenticado, setAutenticado] = useState(false);
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Data
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal alta/modificación usuario
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    clave: '',
    es_admin: false,
    activo: true,
    first_login: true,
    telefono: '',
    mail: '',
    tecnico: false,
    roles: [] as number[],
    isEdit: false
  });
  const [saving, setSaving] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !authPass) {
      setAuthError('Completar todos los campos');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/hyperisp/api/auth/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUser,
          password: authPass,
          actionName: 'GESTION_USUARIOS',
          targetId: 'panel'
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAutenticado(true);
        fetchDatos();
      } else {
        setAuthError(data.message || 'Acceso denegado. Se requiere perfil Administrador.');
      }
    } catch (e: any) {
      setAuthError('Error de red o conexión');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOpenNewUser = () => {
    setFormData({
      id: '',
      nombre: '',
      clave: '',
      es_admin: false,
      activo: true,
      first_login: true,
      telefono: '',
      mail: '',
      tecnico: false,
      roles: [],
      isEdit: false
    });
    setShowModal(true);
  };

  const handleOpenEditUser = (user: any) => {
    const extractedId = getUserId(user);
    const extractedNombre = getUserName(user);
    setFormData({
      id: extractedId === '-' ? '' : extractedId,
      nombre: extractedNombre === 'Sin Nombre' ? '' : extractedNombre,
      clave: '',
      es_admin: user.es_admin || false,
      activo: user.activo !== false,
      first_login: user.first_login !== false,
      telefono: user.telefono || '',
      mail: user.mail || '',
      tecnico: user.tecnico || false,
      roles: user.roles ? user.roles.map((r: any) => r.id) : [],
      isEdit: true
    });
    setShowModal(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm(`¿Estás seguro de eliminar el usuario "${id}"?`)) return;
    try {
      const res = await fetch(`/hyperisp/api/usuarios/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setUsuarios(prev => prev.filter(u => getUserId(u) !== id));
      } else {
        alert('Error al eliminar usuario: ' + (data.error || data.message));
      }
    } catch (e: any) {
      alert('Error al eliminar usuario: ' + e.message);
    }
  };

  const handleSaveUser = async () => {
    if (!formData.id) {
      alert('El ID de usuario es requerido');
      return;
    }
    if (!formData.isEdit && !formData.clave) {
      alert('Para un usuario nuevo la clave es obligatoria');
      return;
    }

    try {
      setSaving(true);
      const url = formData.isEdit ? `/hyperisp/api/usuarios/${formData.id}` : '/hyperisp/api/usuarios';
      const method = formData.isEdit ? 'PUT' : 'POST';

      const payloadToSave = {
        ...formData,
        roles: formData.es_admin ? [] : formData.roles
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSave)
      });
      const data = await res.json();

      if (data.success) {
        if (payloadToSave.roles && payloadToSave.roles.length >= 0) {
          try {
            await fetch(`/hyperisp/api/usuarios/${formData.id}/roles`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payloadToSave.roles)
            });
          } catch (roleErr) {
            console.error('Error al actualizar roles del usuario:', roleErr);
          }
        }

        setShowModal(false);
        fetchDatos();
      } else {
        alert('Error: ' + (data.error || data.message));
      }
    } catch (e: any) {
      console.error(e);
      alert('Error de red o conexión: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (rolId: number) => {
    setFormData(prev => {
      const roles = prev.roles.includes(rolId)
        ? prev.roles.filter(id => id !== rolId)
        : [...prev.roles, rolId];
      return { ...prev, roles };
    });
  };

  const fetchDatos = async () => {
    try {
      setLoading(true);
      setApiError('');
      const [resRoles, resUsuarios] = await Promise.all([
        fetch('/hyperisp/api/roles'),
        fetch('/hyperisp/api/usuarios')
      ]);
      const dataRoles = await resRoles.json();
      const dataUsuarios = await resUsuarios.json();

      let errs = [];

      if (dataRoles && dataRoles.success && Array.isArray(dataRoles.data)) {
        setRoles(dataRoles.data);
      } else if (Array.isArray(dataRoles)) {
        setRoles(dataRoles);
      } else {
        errs.push(`Roles: ${dataRoles?.error || dataRoles?.message || 'Formato incorrecto'}`);
      }

      if (dataUsuarios && dataUsuarios.success && Array.isArray(dataUsuarios.data)) {
        setUsuarios(dataUsuarios.data);
      } else if (Array.isArray(dataUsuarios)) {
        setUsuarios(dataUsuarios);
      } else {
        errs.push(`Usuarios: ${dataUsuarios?.error || dataUsuarios?.message || 'Formato incorrecto'}`);
      }

      if (errs.length > 0) {
        setApiError(errs.join(' | '));
      }
    } catch (e: any) {
      console.error('Error cargando roles/usuarios:', e);
      setApiError(`Error de conexión: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const getUserId = (u: any): string => {
    if (!u) return '-';
    if (typeof u === 'string') return u;
    if (Array.isArray(u)) return String(u[0] ?? '-');
    const val = u.id ?? u.ID ?? u.Id ?? u.usuario ?? u.USUARIO ?? u.username ?? u.userId ?? u.user_id ?? u.codigo ?? u.login ?? u.id_usuario ?? u.idUsuario ?? u.usr;
    if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
    for (const k of Object.keys(u)) {
      const lower = k.toLowerCase();
      if (lower.includes('id') || lower === 'usuario' || lower === 'username' || lower === 'codigo' || lower === 'login' || lower === 'usr') {
        const v = u[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
    }
    return '-';
  };

  const getUserName = (u: any): string => {
    if (!u) return 'Sin Nombre';
    if (typeof u === 'string') return u;
    if (Array.isArray(u)) return String(u[1] ?? 'Sin Nombre');
    const val = u.nombre ?? u.NOMBRE ?? u.Nombre ?? u.nombre_completo ?? u.nombreCompleto ?? u.fullname ?? u.name ?? u.descripcion ?? u.razon_social ?? u.razonSocial ?? u.operador ?? u.OPERADOR;
    if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
    for (const k of Object.keys(u)) {
      const lower = k.toLowerCase();
      if (lower.includes('nombre') || lower.includes('name') || lower.includes('operador') || lower === 'descripcion' || lower === 'razon_social') {
        const v = u[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
    }
    return 'Sin Nombre';
  };

  const getUserFechaAlta = (u: any): string => {
    if (!u) return '-';
    if (Array.isArray(u)) return String(u[2] ?? '-');
    const val = u.fecha_alta ?? u.FECHA_ALTA ?? u.fechaAlta ?? u.fecha ?? u.FECHA ?? u.alta ?? u.created_at ?? u.createdAt ?? u.fechaCreacion ?? u.fecha_creacion;
    if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
    for (const k of Object.keys(u)) {
      const lower = k.toLowerCase();
      if (lower.includes('fecha') || lower.includes('alta') || lower.includes('created') || lower.includes('date')) {
        const v = u[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
    }
    return '-';
  };

  // Filtrado en vivo de usuarios
  const usuariosFiltrados = usuarios.filter(u => {
    const query = searchTerm.toLowerCase();
    const idStr = getUserId(u).toLowerCase();
    const nombreStr = getUserName(u).toLowerCase();
    const mailStr = String(u.mail || '').toLowerCase();
    return idStr.includes(query) || nombreStr.includes(query) || mailStr.includes(query);
  });

  // ──────────────────────────────────────────────
  // Si NO está autenticado: Pantalla de login Blade Runner
  // ──────────────────────────────────────────────
  if (!autenticado) {
    return (
      <div className="flex items-center justify-center min-h-[85vh] p-4">
        <div className="bg-black/60 border border-purple-900/50 rounded-2xl p-8 max-w-md w-full backdrop-blur-xl shadow-[0_0_40px_rgba(149,0,255,0.15)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-cyan-400"></div>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <Lock className="h-6 w-6 text-purple-400 drop-shadow-[0_0_8px_rgba(149,0,255,0.8)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-widest uppercase">AUTENTICACIÓN REQUERIDA</h2>
              <p className="text-[10px] text-purple-400/60 font-mono tracking-widest uppercase">Módulo de Gestión de Usuarios</p>
            </div>
          </div>

          <p className="text-gray-400 text-xs font-mono mb-6 leading-relaxed">
            Se requiere nivel de acceso <span className="text-cyan-400 font-bold">ADMINISTRADOR</span> para ingresar a la configuración y permisos de cuentas.
          </p>

          {authError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-red-400 text-xs font-mono">
              [ERROR]: {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-purple-400 tracking-widest uppercase mb-1.5">USUARIO ADMINISTRADOR</label>
              <input
                type="text"
                value={authUser}
                onChange={e => setAuthUser(e.target.value)}
                placeholder="Ej: admin"
                className="w-full bg-black/60 border border-purple-900/60 text-white p-2.5 text-sm rounded-lg focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-purple-400 tracking-widest uppercase mb-1.5">CLAVE DE ACCESO</label>
              <input
                type="password"
                value={authPass}
                onChange={e => setAuthPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-black/60 border border-purple-900/60 text-white p-2.5 text-sm rounded-lg focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 py-3 px-4 rounded-lg bg-transparent border border-purple-500/60 text-purple-300 font-bold text-xs tracking-widest hover:bg-purple-500/20 hover:text-white transition-all shadow-[0_0_15px_rgba(149,0,255,0.15)] flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  VERIFICANDO...
                </>
              ) : (
                "INGRESAR AL PANEL"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // Autenticado: Panel Blade Runner 2049
  // ──────────────────────────────────────────────
  return (
    <div className="p-3 lg:p-6 max-w-[1400px] mx-auto space-y-6">

      {/* Alerta de Error API si existe */}
      {apiError && (
        <div className="p-4 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm flex items-center justify-between shadow-lg font-mono">
          <span>[WARNING]: {apiError}</span>
          <button
            onClick={() => setApiError('')}
            className="text-xs text-red-400 underline hover:text-white ml-4"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CAJA PRINCIPAL: DIRECTORIO DE USUARIOS (Blade Runner 2049)  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="bg-black/40 border border-purple-900/50 rounded-2xl backdrop-blur-xl shadow-[0_0_30px_rgba(149,0,255,0.08)] flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-cyan-400"></div>

        {/* Encabezado e inputs */}
        <div className="p-5 border-b border-purple-900/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <Cpu className="w-5 h-5 text-purple-400 drop-shadow-[0_0_5px_rgba(149,0,255,0.8)]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">GESTIÓN DE USUARIOS Y ROLES</h2>
                <p className="text-[10px] text-purple-400/60 font-mono tracking-widest uppercase">
                  Directorio del personal · Sesión: <span className="text-cyan-400">{authUser}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/hyperisp/dashboard')}
                className="bg-transparent border border-gray-600/50 text-gray-400 px-4 py-2 text-xs font-bold tracking-widest hover:bg-gray-800 hover:text-white transition-all rounded font-mono flex items-center gap-2"
                title="Volver al menú principal"
              >
                <ArrowLeft className="w-4 h-4" /> VOLVER
              </button>
              <button
                onClick={fetchDatos}
                className="bg-transparent border border-purple-500/50 text-purple-400 px-4 py-2 text-xs font-bold tracking-widest hover:bg-purple-500/20 hover:text-white transition-all rounded font-mono"
                title="Refrescar datos"
              >
                REFRESCAR
              </button>
              <button
                onClick={handleOpenNewUser}
                className="bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 px-5 py-2 text-xs font-bold tracking-widest hover:bg-cyan-400 hover:text-black transition-all rounded shadow-[0_0_15px_rgba(0,243,255,0.3)] flex items-center gap-2 font-mono"
              >
                <Plus className="w-4 h-4" /> NUEVO USUARIO
              </button>
            </div>
          </div>

          {/* Barra de búsqueda dentro del panel */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-purple-400/60 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar por ID, Nombre del operador o Correo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-black/50 border border-gray-800 text-white pl-9 pr-4 py-2 text-sm rounded focus:outline-none focus:border-purple-400 focus:shadow-[0_0_15px_rgba(149,0,255,0.2)] transition-all font-mono placeholder:text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="flex-1 overflow-x-auto max-h-[65vh]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-black/90 backdrop-blur-xl z-10">
              <tr className="border-b border-purple-900/40">
                <th className="py-3 px-4 text-purple-400 text-[10px] tracking-widest font-bold">ID / USUARIO</th>
                <th className="py-3 px-4 text-purple-400 text-[10px] tracking-widest font-bold">NOMBRE COMPLETO</th>
                <th className="py-3 px-4 text-purple-400 text-[10px] tracking-widest font-bold">FECHA ALTA</th>
                <th className="py-3 px-4 text-purple-400 text-[10px] tracking-widest font-bold text-center">ESTADO</th>
                <th className="py-3 px-4 text-purple-400 text-[10px] tracking-widest font-bold text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500 font-mono text-xs tracking-widest">
                    CONSULTANDO DIRECTORIO EN BASE DE DATOS...
                  </td>
                </tr>
              ) : usuariosFiltrados.length > 0 ? (
                usuariosFiltrados.map((user: any) => {
                  return (
                    <tr
                      key={getUserId(user)}
                      className="border-b border-gray-900/60 transition-all duration-200 select-none group hover:bg-cyan-500/10 hover:border-cyan-500/40"
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
                          {getUserId(user)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-white font-medium text-xs tracking-wide group-hover:text-cyan-200 transition-colors">
                          {getUserName(user)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs text-gray-400 group-hover:text-gray-200">
                          {getUserFechaAlta(user)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {user.activo !== false ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-green-500/50 text-green-400 bg-green-500/10">
                            ✓ ACTIVO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-red-500/50 text-red-400 bg-red-500/10">
                            ✗ INACTIVO
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditUser(user)}
                            className="p-1.5 rounded bg-transparent border border-gray-700 text-gray-400 hover:border-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                            title="Modificar usuario"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(getUserId(user))}
                            className="p-1.5 rounded bg-transparent border border-gray-800 text-gray-500 hover:border-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-600 font-mono text-xs tracking-widest">
                    NO SE ENCONTRARON USUARIOS EN EL DIRECTORIO
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info de cantidad */}
        {usuariosFiltrados.length > 0 && (
          <div className="p-3 border-t border-purple-900/20 text-right">
            <span className="text-[10px] text-purple-400/60 font-mono tracking-widest uppercase">
              {usuariosFiltrados.length} OPERADORES EN SISTEMA
            </span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL ALTA / MODIFICAR USUARIO (Cyberpunk Blade Runner)      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0a0a10] border border-purple-900/80 p-6 rounded-2xl w-full max-w-lg space-y-5 shadow-[0_0_50px_rgba(149,0,255,0.2)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-cyan-400"></div>

            <div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-cyan-400" />
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                  {formData.isEdit ? 'MODIFICAR USUARIO' : 'ALTA DE NUEVO USUARIO'}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-purple-400 tracking-widest uppercase block">ID / USERNAME</label>
                <input
                  className="w-full px-3 py-2 rounded bg-black/60 border border-purple-900/60 text-white text-xs placeholder-gray-600 outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all font-mono disabled:opacity-50"
                  value={formData.id}
                  onChange={e => setFormData({ ...formData, id: e.target.value })}
                  placeholder="Ej: mmartinez"
                  disabled={formData.isEdit}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-purple-400 tracking-widest uppercase block">
                  {formData.isEdit ? 'NUEVA CLAVE (VACÍO = NO CAMBIA)' : 'CLAVE DE ACCESO'}
                </label>
                <input
                  type="password"
                  className="w-full px-3 py-2 rounded bg-black/60 border border-purple-900/60 text-white text-xs placeholder-gray-600 outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all font-mono"
                  value={formData.clave}
                  onChange={e => setFormData({ ...formData, clave: e.target.value })}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-purple-400 tracking-widest uppercase block">NOMBRE COMPLETO</label>
              <input
                className="w-full px-3 py-2 rounded bg-black/60 border border-purple-900/60 text-white text-xs placeholder-gray-600 outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Martín Martínez"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-purple-400 tracking-widest uppercase block">CORREO ELECTRÓNICO</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 rounded bg-black/60 border border-purple-900/60 text-white text-xs placeholder-gray-600 outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all font-mono"
                  value={formData.mail}
                  onChange={e => setFormData({ ...formData, mail: e.target.value })}
                  placeholder="operador@hyperisp.net"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-purple-400 tracking-widest uppercase block">TELÉFONO / CELULAR</label>
                <input
                  className="w-full px-3 py-2 rounded bg-black/60 border border-purple-900/60 text-white text-xs placeholder-gray-600 outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all font-mono"
                  value={formData.telefono}
                  onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="11 4000-0000"
                />
              </div>
            </div>

            {/* Checkboxes de Perfil Base */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <label className="flex items-center gap-2.5 p-2.5 rounded bg-black/40 border border-purple-900/40 cursor-pointer hover:border-purple-500 transition-all select-none">
                <input
                  type="checkbox"
                  checked={formData.es_admin}
                  onChange={e => setFormData({ ...formData, es_admin: e.target.checked })}
                  className="w-4 h-4 accent-red-500"
                />
                <span className="text-xs font-mono text-red-400 font-bold">ADMINISTRADOR GLOBAL</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded bg-black/40 border border-purple-900/40 cursor-pointer hover:border-purple-500 transition-all select-none">
                <input
                  type="checkbox"
                  checked={formData.tecnico}
                  onChange={e => setFormData({ ...formData, tecnico: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400"
                />
                <span className="text-xs font-mono text-cyan-300 font-bold">PERFIL TÉCNICO</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded bg-black/40 border border-purple-900/40 cursor-pointer hover:border-purple-500 transition-all select-none">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 accent-green-500"
                />
                <span className="text-xs font-mono text-green-400">USUARIO ACTIVO</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded bg-black/40 border border-purple-900/40 cursor-pointer hover:border-purple-500 transition-all select-none">
                <input
                  type="checkbox"
                  checked={formData.first_login}
                  onChange={e => setFormData({ ...formData, first_login: e.target.checked })}
                  className="w-4 h-4 accent-purple-500"
                />
                <span className="text-xs font-mono text-purple-300">Debe Cambiar la clave al entrar primera vez</span>
              </label>
            </div>

            {/* Asignación de Plantillas de Roles (Tildar / Destildar) */}
            {!formData.es_admin && (
              <div className="pt-3 border-t border-purple-900/30">
                <label className="text-[10px] font-mono text-purple-400 tracking-widest uppercase block mb-2">
                  ASIGNAR ROLES / PLANTILLAS (TILDAR O DESTILDAR)
                </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-black/40 rounded border border-purple-900/30">
                {roles.map(r => {
                  const isChecked = formData.roles.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleRole(r.id)}
                      className={`flex items-center gap-2.5 p-2 rounded cursor-pointer border transition-all text-xs select-none font-mono ${isChecked
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:border-purple-500/50 hover:text-white'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => { }}
                        className="w-3.5 h-3.5 accent-cyan-400 pointer-events-none"
                      />
                      <span className="truncate">{r.rol || r.nombre}</span>
                    </div>
                  );
                })}
                {roles.length === 0 && (
                  <span className="text-xs text-gray-500 font-mono col-span-2 p-2 text-center">No hay roles cargados</span>
                )}
              </div>
            </div>
            )}

            {/* Botones de acción del Modal */}
            <div className="flex justify-end gap-3 pt-3 border-t border-purple-900/30">
              <button
                className="px-5 py-2.5 rounded bg-transparent border border-purple-500/50 text-purple-400 font-mono text-xs tracking-widest hover:bg-purple-500/20 hover:text-white transition-all"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                CANCELAR
              </button>
              <button
                className="px-6 py-2.5 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-mono font-bold text-xs tracking-widest hover:bg-cyan-400 hover:text-black transition-all shadow-[0_0_15px_rgba(0,243,255,0.3)] disabled:opacity-50"
                onClick={handleSaveUser}
                disabled={saving || !formData.id || (!formData.isEdit && !formData.clave)}
              >
                {saving ? 'GUARDANDO...' : (formData.isEdit ? 'GUARDAR CAMBIOS' : 'CREAR USUARIO')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
