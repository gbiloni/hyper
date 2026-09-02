"use client";

import { useState } from "react";
import { ShieldAlert, Lock, User, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface PageAuthGuardProps {
  requiredRole: number;
  moduleName: string;
  children: React.ReactNode;
}

export default function PageAuthGuard({ requiredRole, moduleName, children }: PageAuthGuardProps) {
  const { hasRole } = useAuth() as any;
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsAuth = !hasRole(requiredRole);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError("Completar todos los campos"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/hyperisp/api/auth/verify-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, actionName: "ACCESO_MODULO", targetId: requiredRole }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthorized(true);
      } else {
        setError(data.message || "Acceso denegado");
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {needsAuth && !authorized && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-black/90 border border-purple-900/50 p-8 w-full max-w-md shadow-[0_0_30px_rgba(149,0,255,0.3)] relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-cyan-400" />
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-900/30 border border-purple-500 flex items-center justify-center mb-4">
                <ShieldAlert className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-xl text-cyan-400 font-mono tracking-widest uppercase">Autorización Requerida</h2>
              <p className="text-gray-400 text-xs mt-2 font-mono">
                Módulo: <span className="text-white">{moduleName}</span>
              </p>
              <p className="text-gray-500 text-[10px] mt-1 font-mono uppercase">
                Esta acción será auditada (IP, Terminal, Fecha y Hora)
              </p>
            </div>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                <input
                  type="text"
                  placeholder="Usuario"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                  className="w-full bg-black border border-gray-700 text-white pl-10 pr-4 py-3 font-mono focus:border-purple-500 outline-none transition-colors"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black border border-gray-700 text-white pl-10 pr-4 py-3 font-mono focus:border-purple-500 outline-none transition-colors"
                />
              </div>
              {error && (
                <div className="p-2 bg-red-900/30 border border-red-500 text-red-400 text-xs font-mono text-center">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-900/40 border border-purple-500 text-purple-300 py-3 font-bold tracking-widest hover:bg-purple-500 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />VERIFICANDO...</> : "AUTORIZAR Y CONTINUAR"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 text-xs font-mono tracking-widest py-2 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> CANCELAR Y VOLVER
              </button>
            </form>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
