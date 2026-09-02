"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, User, Loader2, KeyRound, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { syncNodeName } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sysName, setSysName] = useState("HyperISP");
  const [sysLogo, setSysLogo] = useState("");

  // Estado para cambio de clave obligatorio
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordUser, setChangePasswordUser] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeError, setChangeError] = useState("");
  const [changeLoading, setChangeLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    async function fetchSysInfo() {
      try {
        const res = await fetch("/hypercrm/api/system/info");
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          if (data.data.nombre_empresa) {
            setSysName(data.data.nombre_empresa);
            document.title = `${data.data.nombre_empresa.trim()} | Hyper ISP`;
          }
          if (data.data.logo_empresa) setSysLogo(data.data.logo_empresa);
        }
      } catch (err) {
        console.error("Error al cargar info/logo e la empresa", err);
      }
    }
    fetchSysInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/hypercrm/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Verificar si es primer login → cambio de clave obligatorio
        const user = data.user;
        if (user.first_login === true || user.first_login === 1 || user.first_login === "true") {
          setShowChangePassword(true);
          setChangePasswordUser(username);
          setCurrentPassword(password);
          setLoading(false);
          return;
        }

        if (sysName) {
          syncNodeName(sysName).catch(err => console.error("Error syncing node name:", err));
        }
        window.location.href = "/hypercrm/dashboard";
      } else {
        setError(data.message || "Acceso Denegado");
      }
    } catch (err) {
      setError("Error de conexión al mainframe.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setChangeError("");

    if (newPassword.trim().length < 4) {
      setChangeError("La nueva clave debe tener al menos 4 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError("Las claves no coinciden");
      return;
    }
    if (newPassword === currentPassword) {
      setChangeError("La nueva clave no puede ser igual a la actual");
      return;
    }

    setChangeLoading(true);
    try {
      const res = await fetch("/hypercrm/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: changePasswordUser,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Login automático con la nueva clave
        const loginRes = await fetch("/hypercrm/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: changePasswordUser, password: newPassword }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.success) {
          if (sysName) {
            syncNodeName(sysName).catch(err => console.error("Error syncing node name:", err));
          }
          window.location.href = "/hypercrm/dashboard";
        } else {
          setShowChangePassword(false);
          setError("Clave actualizada. Ingresá con tu nueva clave.");
        }
      } else {
        setChangeError(data.message || "Error al cambiar la clave");
      }
    } catch (err) {
      setChangeError("Error de conexión al servidor");
    } finally {
      setChangeLoading(false);
    }
  };

  // ==========================================
  // MODAL: CAMBIO DE CLAVE OBLIGATORIO
  // ==========================================
  if (showChangePassword) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1b2a 40%, #12002a 70%, #0a0a0f 100%)', minHeight: '100vh' }}
        className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 p-10 glass-panel rounded-lg relative overflow-hidden">
          {/* Glow Effects */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-neon-magenta rounded-full mix-blend-screen filter blur-[80px] opacity-40"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-neon-cyan rounded-full mix-blend-screen filter blur-[80px] opacity-30"></div>

          <div className="text-center relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full border-2 border-neon-magenta/60 bg-neon-magenta/10 flex items-center justify-center shadow-[0_0_20px_rgba(255,0,128,0.3)]">
              <ShieldAlert className="h-8 w-8 text-neon-magenta" />
            </div>
            <h2 className="text-lg font-mono font-bold text-neon-magenta tracking-widest uppercase">
              CAMBIO DE CLAVE OBLIGATORIO
            </h2>
            <p className="text-xs text-matrix/70 font-mono leading-relaxed">
              Es tu primer inicio de sesión. Por seguridad,<br/>
              debés establecer una nueva clave de acceso.
            </p>
          </div>

          <form className="space-y-5 relative z-10" onSubmit={handleChangePassword}>
            {/* Usuario (solo lectura) */}
            <div>
              <label className="block text-xs font-mono text-matrix/60 uppercase tracking-wider mb-1.5">USUARIO</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-matrix/40" />
                </div>
                <input
                  type="text"
                  readOnly
                  value={changePasswordUser}
                  className="block w-full rounded border border-matrix/20 bg-background/40 py-2.5 pl-10 pr-3 text-matrix/60 font-mono text-sm cursor-not-allowed"
                />
              </div>
            </div>

            {/* Nueva Clave */}
            <div>
              <label className="block text-xs font-mono text-neon-cyan/80 uppercase tracking-wider mb-1.5">NUEVA CLAVE DE ACCESO</label>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-neon-cyan group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={4}
                  className="block w-full rounded border border-neon-cyan/40 bg-background/60 py-3 pl-10 pr-10 text-matrix placeholder-matrix/50 focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan sm:text-sm font-mono tracking-wider transition-all"
                  placeholder="NUEVA CLAVE"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-matrix/50 hover:text-neon-cyan transition-colors"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmar Clave */}
            <div>
              <label className="block text-xs font-mono text-neon-cyan/80 uppercase tracking-wider mb-1.5">CONFIRMAR NUEVA CLAVE</label>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-neon-cyan group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={4}
                  className="block w-full rounded border border-neon-cyan/40 bg-background/60 py-3 pl-10 pr-10 text-matrix placeholder-matrix/50 focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan sm:text-sm font-mono tracking-wider transition-all"
                  placeholder="CONFIRMAR CLAVE"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-matrix/50 hover:text-neon-cyan transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Indicador de fortaleza */}
            {newPassword.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        newPassword.length >= level * 3
                          ? level <= 1 ? "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]"
                          : level <= 2 ? "bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.5)]"
                          : level <= 3 ? "bg-neon-cyan shadow-[0_0_4px_rgba(0,255,255,0.5)]"
                          : "bg-matrix-green shadow-[0_0_4px_rgba(0,255,102,0.5)]"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-mono text-matrix/50 text-right">
                  {newPassword.length < 4 ? "MUY CORTA" : newPassword.length < 6 ? "DÉBIL" : newPassword.length < 9 ? "MODERADA" : newPassword.length < 12 ? "FUERTE" : "MUY FUERTE"}
                </p>
              </div>
            )}

            {/* Match indicator */}
            {confirmPassword.length > 0 && (
              <p className={`text-[11px] font-mono text-center ${newPassword === confirmPassword ? "text-matrix-green" : "text-neon-magenta"}`}>
                {newPassword === confirmPassword ? "✓ LAS CLAVES COINCIDEN" : "✗ LAS CLAVES NO COINCIDEN"}
              </p>
            )}

            {changeError && (
              <div className="rounded bg-black/50 p-3 border border-neon-magenta shadow-[0_0_10px_var(--neon-magenta)]">
                <p className="text-sm font-mono text-neon-magenta text-center uppercase tracking-wider">{changeError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={changeLoading || newPassword.length < 4 || newPassword !== confirmPassword}
              className="btn-neon w-full flex justify-center py-3 text-sm tracking-widest disabled:opacity-50 mt-2"
            >
              {changeLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "ESTABLECER NUEVA CLAVE"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // PANTALLA DE LOGIN NORMAL
  // ==========================================
  return (
    <div style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1b2a 40%, #12002a 70%, #0a0a0f 100%)', minHeight: '100vh' }}
      className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 p-10 glass-panel rounded-lg relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-neon-cyan rounded-full mix-blend-screen filter blur-[80px] opacity-30"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-neon-magenta rounded-full mix-blend-screen filter blur-[80px] opacity-30"></div>

        <div className="text-center relative z-10 flex flex-col items-center">
          {/* Logo de la app */}
          <img
            src="/hyper.ico"
            alt="Hyper ISP"
            style={{ height: '96px', width: 'auto', objectFit: 'contain', marginBottom: '0.75rem', filter: 'drop-shadow(0 0 16px rgba(149,0,255,0.7))' }}
          />
          {/* Logo y nombre de la empresa (desde la BD) */}
          {sysLogo && (
            <img src={sysLogo} alt={sysName} style={{ height: '56px', width: 'auto', objectFit: 'contain', marginBottom: '0.5rem', filter: 'drop-shadow(0 0 8px rgba(0,243,255,0.4))' }} />
          )}
          {sysName && (
            <p className="text-sm text-matrix opacity-80 tracking-widest uppercase mb-2">{sysName}</p>
          )}
        </div>

        <form className="mt-8 space-y-6 relative z-10" onSubmit={handleSubmit} autoComplete="off">
          <div className="space-y-5">
            <div>
              <label className="sr-only" htmlFor="username">IDENTIFICADOR</label>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-neon-cyan group-focus-within:text-white transition-colors" aria-hidden="true" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="off"
                  className="block w-full rounded border border-neon-cyan/40 bg-background/60 py-3 pl-10 pr-3 text-matrix placeholder-matrix/50 focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan sm:text-sm font-mono tracking-wider transition-all"
                  placeholder="IDENTIFICADOR"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="sr-only" htmlFor="password">CÓDIGO DE ACCESO</label>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-neon-cyan group-focus-within:text-white transition-colors" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="block w-full rounded border border-neon-cyan/40 bg-background/60 py-3 pl-10 pr-3 text-matrix placeholder-matrix/50 focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan sm:text-sm font-mono tracking-wider transition-all"
                  placeholder="CÓDIGO DE ACCESO"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded bg-black/50 p-3 border border-neon-magenta shadow-[0_0_10px_var(--neon-magenta)]">
              <p className="text-sm font-mono text-neon-magenta text-center uppercase tracking-wider">{error}</p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-neon w-full flex justify-center py-3 text-sm tracking-widest disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "INICIALIZAR CONEXIÓN"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
