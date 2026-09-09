"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";

// Softphone WebRTC embebido (JsSIP) para llamadas de WhatsApp (Calling API
// vía SIP) contra el Issabel dedicado. Se activa solo si el agente logueado
// tiene un interno cargado en crm_agente_extension -- si el endpoint de
// credenciales devuelve 404 (todavía no tiene uno asignado), el softphone
// simplemente no se registra y el resto de Hypercrm sigue igual.

export type EstadoSoftphone =
  | "inactivo"       // sin interno configurado para este agente/nodo
  | "conectando"
  | "registrado"
  | "timbrando_entrante"
  | "llamando_saliente"
  | "en_curso"
  | "error";

interface LlamadaInfo {
  numero: string;
  direction: "incoming" | "outgoing";
}

interface SoftphoneContextValue {
  estado: EstadoSoftphone;
  llamadaActual: LlamadaInfo | null;
  errorMensaje: string | null;
  contestar: () => void;
  rechazar: () => void;
  colgar: () => void;
  marcar: (numero: string) => void;
  silenciar: (mute: boolean) => void;
  muted: boolean;
}

const SoftphoneContext = createContext<SoftphoneContextValue | null>(null);

export function useSoftphone(): SoftphoneContextValue {
  const ctx = useContext(SoftphoneContext);
  if (!ctx) throw new Error("useSoftphone debe usarse dentro de <SoftphoneProvider>");
  return ctx;
}

export function SoftphoneProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSoftphone>("inactivo");
  const [llamadaActual, setLlamadaActual] = useState<LlamadaInfo | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const uaRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let montado = true;

    (async () => {
      let creds: { extension: string; secret: string; ws_uri: string; sip_domain: string };
      try {
        const res = await fetch("/hypercrm/api/telefonia/credenciales");
        if (!res.ok) {
          // 401 (sin sesión) o 404 (agente sin interno asignado todavía):
          // ninguno de los dos es un error a mostrarle al usuario, el
          // softphone simplemente no arranca.
          return;
        }
        creds = await res.json();
      } catch {
        return; // sin red o el endpoint no respondió: no molestamos al agente
      }
      if (!montado || !creds?.ws_uri || !creds?.extension) return;

      try {
        const JsSIP = (await import("jssip")).default;
        // JsSIP loguea SIP crudo por consola por defecto -- eso incluye el
        // secret del registro en texto plano, no queremos ese leak.
        JsSIP.debug.disable("JsSIP:*");

        const socket = new JsSIP.WebSocketInterface(creds.ws_uri);
        const ua = new JsSIP.UA({
          sockets: [socket],
          uri: `sip:${creds.extension}@${creds.sip_domain}`,
          password: creds.secret,
          register: true,
          session_timers: false,
        });

        ua.on("registered", () => montado && setEstado("registrado"));
        ua.on("unregistered", () => montado && setEstado("inactivo"));
        ua.on("registrationFailed", (e: any) => {
          if (!montado) return;
          setEstado("error");
          setErrorMensaje(e?.cause || "No se pudo registrar el softphone.");
        });
        ua.on("disconnected", () => {
          if (!montado) return;
          setEstado("error");
          setErrorMensaje("Se perdió la conexión con el softswitch.");
        });

        ua.on("newRTCSession", (data: any) => {
          const session = data.session;
          sessionRef.current = session;

          if (data.originator === "remote") {
            const numero = session.remote_identity?.uri?.user || "Desconocido";
            setLlamadaActual({ numero, direction: "incoming" });
            setEstado("timbrando_entrante");
          }

          session.on("peerconnection", (e: any) => {
            const pc: RTCPeerConnection = e.peerconnection;
            pc.ontrack = (ev: RTCTrackEvent) => {
              if (audioRef.current) {
                audioRef.current.srcObject = ev.streams[0];
                audioRef.current.play().catch(() => {});
              }
            };
          });

          session.on("accepted", () => montado && setEstado("en_curso"));
          session.on("confirmed", () => montado && setEstado("en_curso"));

          const finalizar = () => {
            if (!montado) return;
            setEstado("registrado");
            setLlamadaActual(null);
            setMuted(false);
            sessionRef.current = null;
          };
          session.on("ended", finalizar);
          session.on("failed", finalizar);
        });

        uaRef.current = ua;
        setEstado("conectando");
        ua.start();
      } catch (err: any) {
        if (montado) {
          setEstado("error");
          setErrorMensaje(err?.message || "No se pudo inicializar el softphone.");
        }
      }
    })();

    return () => {
      montado = false;
      try {
        sessionRef.current?.terminate();
      } catch {}
      try {
        uaRef.current?.stop();
      } catch {}
    };
  }, []);

  const contestar = useCallback(() => {
    sessionRef.current?.answer({ mediaConstraints: { audio: true, video: false } });
  }, []);

  const rechazar = useCallback(() => {
    sessionRef.current?.terminate();
  }, []);

  const colgar = useCallback(() => {
    sessionRef.current?.terminate();
  }, []);

  const marcar = useCallback((numero: string) => {
    const ua = uaRef.current;
    if (!ua || (estado !== "registrado")) {
      setErrorMensaje("El softphone todavía no está registrado.");
      return;
    }
    setErrorMensaje(null);
    // La ruta saliente hacia el trunk de Meta ya está armada en Issabel
    // ([from-internal-custom]: cualquier número de 9+ dígitos discado desde
    // un interno sale por PJSIP/+${EXTEN}@meta-whatsapp) -- alcanza con
    // discar al propio dominio del softphone. Lo único que importa acá es
    // que `numero` ya venga en el formato que espera Meta (54+área+15+abonado,
    // ver formatearDestinoWhatsAppAR): el caller de marcar() es responsable
    // de convertirlo antes de llamar, este contexto no lo reformatea.
    const dominio = ua.configuration?.uri?.host || "";
    const session = ua.call(`sip:${numero}@${dominio}`, {
      mediaConstraints: { audio: true, video: false },
    });
    sessionRef.current = session;
    setLlamadaActual({ numero, direction: "outgoing" });
    setEstado("llamando_saliente");
  }, [estado]);

  const silenciar = useCallback((mute: boolean) => {
    const session = sessionRef.current;
    if (!session) return;
    if (mute) session.mute({ audio: true });
    else session.unmute({ audio: true });
    setMuted(mute);
  }, []);

  return (
    <SoftphoneContext.Provider
      value={{ estado, llamadaActual, errorMensaje, contestar, rechazar, colgar, marcar, silenciar, muted }}
    >
      {children}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} autoPlay style={{ display: "none" }} />
    </SoftphoneContext.Provider>
  );
}
