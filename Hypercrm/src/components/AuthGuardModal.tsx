import { useState } from "react";
import { ShieldAlert, Lock, User, Loader2, X } from "lucide-react";

interface AuthGuardModalProps {
  isOpen: boolean;
  actionName: string;
  targetId: string | number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthGuardModal({ isOpen, actionName, targetId, onClose, onSuccess }: AuthGuardModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Completar todos los campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/hyperisp/api/auth/verify-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          actionName,
          targetId
        }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess(); // Credenciales correctas y es_admin == true
        setUsername("");
        setPassword("");
      } else {
        setError(data.message || "Acceso denegado");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-background-panel border border-[var(--primary)]/50 p-8 w-full max-w-md shadow-[0_0_30px_var(--glow-primary)] relative group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--primary)]/30 border border-[var(--primary)] flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-[var(--primary)]" />
          </div>
          <h2 className="text-xl text-[var(--accent)] font-mono tracking-widest uppercase">Autorización Requerida</h2>
          <p className="text-[var(--text-muted)] text-xs mt-2 font-mono">
            Acción: <span className="text-[var(--text-main)]">{actionName}</span> (ID: {targetId})
          </p>
          <p className="text-[var(--text-muted)] opacity-70 text-[10px] mt-1 font-mono uppercase">
            Esta acción será auditada (IP, Terminal, Fecha y Hora)
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--primary)]" />
            <input
              type="text"
              placeholder="Usuario Admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-background border border-[var(--primary)]/30 text-[var(--text-main)] pl-10 pr-4 py-3 font-mono focus:border-[var(--primary)] outline-none transition-colors"
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--primary)]" />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-[var(--primary)]/30 text-[var(--text-main)] pl-10 pr-4 py-3 font-mono focus:border-[var(--primary)] outline-none transition-colors"
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
            className="w-full bg-[var(--primary)]/40 border border-[var(--primary)] text-[var(--text-main)] py-3 font-bold tracking-widest hover:bg-[var(--primary)] transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                VERIFICANDO...
              </>
            ) : (
              "AUTORIZAR Y CONTINUAR"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
