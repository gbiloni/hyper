"use client";

import { useEffect, useState } from "react";
import { PhoneCall, PhoneOff, Mic, MicOff, AlertTriangle } from "lucide-react";
import { useSoftphone } from "@/context/SoftphoneContext";

// Banner flotante del softphone -- se monta una sola vez en MainLayout, así
// que una llamada entrante se ve desde cualquier pantalla de Hypercrm, no
// solo desde la bandeja de soporte.
export default function SoftphoneWidget() {
  const { estado, llamadaActual, errorMensaje, contestar, rechazar, colgar, silenciar, muted } = useSoftphone();
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (estado !== "en_curso") {
      setSegundos(0);
      return;
    }
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [estado]);

  // Sin interno asignado o todavía registrando: no hay nada que mostrarle
  // al agente.
  if (estado === "inactivo" || estado === "conectando") return null;

  // Registrado pero sin llamada activa: el softphone está bien, se queda
  // en silencio (no hace falta un indicador permanente en pantalla).
  if (estado === "registrado" && !llamadaActual) return null;

  // Error sin llamada en curso: un aviso chico, no bloqueante.
  if (estado === "error" && !llamadaActual) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-lg border border-red-500/40 bg-black/90 px-3 py-2 font-mono text-[11px] text-red-300 shadow-lg">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        Softphone: {errorMensaje}
      </div>
    );
  }

  if (!llamadaActual) return null;

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-72 rounded-xl border border-cyan-500/40 bg-black/90 backdrop-blur-xl shadow-[0_0_30px_rgba(0,243,255,0.15)] p-4 font-mono text-white">
      <div className="flex items-center gap-2 mb-2">
        <PhoneCall className="w-4 h-4 text-cyan-400" />
        <span className="text-xs text-gray-400">
          {estado === "timbrando_entrante" ? "Llamada entrante" : estado === "llamando_saliente" ? "Llamando…" : "En curso"}
        </span>
      </div>

      <p className="text-sm font-bold mb-3">+{llamadaActual.numero}</p>

      {estado === "en_curso" && <p className="text-xs text-green-400 mb-3">{fmt(segundos)}</p>}

      <div className="flex gap-2">
        {estado === "timbrando_entrante" && (
          <>
            <button
              onClick={contestar}
              className="flex-1 py-2 rounded-lg bg-green-600/80 hover:bg-green-600 text-xs font-bold transition-colors"
            >
              Contestar
            </button>
            <button
              onClick={rechazar}
              className="flex-1 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-xs font-bold transition-colors"
            >
              Rechazar
            </button>
          </>
        )}

        {(estado === "llamando_saliente" || estado === "en_curso") && (
          <>
            {estado === "en_curso" && (
              <button
                onClick={() => silenciar(!muted)}
                title={muted ? "Reactivar micrófono" : "Silenciar micrófono"}
                className="p-2 rounded-lg border border-gray-700 hover:border-cyan-400 transition-colors"
              >
                {muted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-cyan-400" />}
              </button>
            )}
            <button
              onClick={colgar}
              className="flex-1 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <PhoneOff className="w-3.5 h-3.5" /> Colgar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
