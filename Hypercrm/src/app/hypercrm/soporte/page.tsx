"use client";
import { useState, useEffect, useRef } from "react";
import { getClienteByCelular, getChatsOmnicanal, enviarMensajeMeta } from "./actions";
import { UserCircle, Phone, MapPin, CreditCard, Activity, Search, Send, Bot, User, CheckCheck, Check, FileText, Settings, Zap, MessageSquare, MessageCircle, RefreshCw } from "lucide-react";

// Instagram fue eliminado de lucide-react v1.x — SVG inline oficial
function Instagram({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

type Msg = { id: string; sender: string; text: string; time: string; read?: boolean };
type Chat = { id: string; name: string; phone: string; avatar: string; channel: string; lastMessage: string; time: string; unread: number; botActive?: boolean; messages?: Msg[] };

const CHANNEL_STYLES: Record<string, { badge: string; text: string; icon: React.ReactNode }> = {
  whatsapp: { badge: "text-green-400 bg-green-950/80 border-green-500/50", text: "WhatsApp", icon: <MessageCircle className="w-3 h-3" /> },
  messenger: { badge: "text-blue-400 bg-blue-950/80 border-blue-500/50",  text: "Messenger", icon: <MessageSquare className="w-3 h-3" /> },
  instagram: { badge: "text-pink-400 bg-pink-950/80 border-pink-500/50",  text: "Instagram", icon: <Instagram className="w-3 h-3" /> },
  telegram: { badge: "text-sky-400 bg-sky-950/80 border-sky-500/50",    text: "Telegram",  icon: <Send className="w-3 h-3" /> },
};

function ChannelBadge({ channel }: { channel: string }) {
  const s = CHANNEL_STYLES[channel] || { badge: "text-cyan-400 bg-cyan-950/80 border-cyan-500/50", text: channel, icon: <Zap className="w-3 h-3" /> };
  return (
    <span className={`flex items-center gap-1 text-[10px] border px-2 py-0.5 rounded font-mono ${s.badge}`}>
      {s.icon}{s.text}
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-gray-800/60 rounded-r-lg rounded-bl-lg w-16 self-start">
      {[0,1,2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

export default function SoportePage() {
  const [chats, setChats]               = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputText, setInputText]       = useState("");
  const [clientData, setClientData]     = useState<any>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [searchTerm, setSearchTerm]     = useState("");
  const [typing, setTyping]             = useState(false);
  const [sending, setSending]           = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const loadChats = async (silent = false) => {
    if (!silent) setRefreshing(true);
    const res = await getChatsOmnicanal();
    if (res?.chats) {
      // Los mensajes vienen siempre del servidor (fuente de verdad); no se
      // preserva el array local salvo para no perder el eco optimista de un
      // envío que todavía no confirmó el próximo refresh.
      setChats(prev => {
        const map = new Map(prev.map(c => [c.id, c]));
        res.chats.forEach((c: Chat) => {
          const anterior = map.get(c.id);
          if (!anterior) { map.set(c.id, c); return; }
          const idsServidor = new Set((c.messages || []).map(m => m.id));
          const optimistas = (anterior.messages || []).filter(m => !idsServidor.has(m.id) && m.id.startsWith('m'));
          map.set(c.id, { ...anterior, ...c, messages: [...(c.messages || []), ...optimistas] });
        });
        return Array.from(map.values());
      });
      if (!activeChatId && res.chats.length > 0) setActiveChatId(res.chats[0].id);
    }
    if (!silent) setRefreshing(false);
  };

  useEffect(() => { loadChats(); }, []);
  useEffect(() => { const t = setInterval(() => loadChats(true), 15000); return () => clearInterval(t); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChatId, chats]);

  const activeChat = chats.find(c => c.id === activeChatId);

  useEffect(() => {
    if (activeChat?.phone) {
      setLoadingClient(true);
      setClientData(null);
      getClienteByCelular(activeChat.phone).then(r => {
        if (!r.error && r.data) { const d = r.data.cliente || r.data; if (d.id) setClientData(r.data); }
        setLoadingClient(false);
      });
    }
  }, [activeChatId]);

  const handleSend = async () => {
    if (!inputText.trim() || !activeChat || sending) return;
    const msg = inputText.trim();
    setInputText("");
    setSending(true);
    const newMsg: Msg = { id: "m" + Date.now(), sender: "agent", text: msg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), read: false };
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...(c.messages || []), newMsg], lastMessage: msg, time: newMsg.time } : c));
    setTyping(true);
    await enviarMensajeMeta(activeChat.id, activeChat.phone, msg);
    setTimeout(() => setTyping(false), 1500);
    setSending(false);
    inputRef.current?.focus();
  };

  const filteredChats = chats.filter(c => {
    const okCh = selectedChannel === "all" || c.channel === selectedChannel;
    const q    = searchTerm.toLowerCase();
    const okSr = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.lastMessage.toLowerCase().includes(q);
    return okCh && okSr;
  });

  const cData     = clientData?.cliente || clientData;
  const planes    = clientData?.planes  || [];
  const saldo     = clientData?.saldo ?? 0;
  const isBaja    = cData?.baja && !String(cData.baja).startsWith("0000-00-00");
  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);

  return (
    <div className="h-[calc(100vh-64px)] p-4 flex gap-4">

      {/* COL 1: Lista de chats */}
      <div className="w-1/4 bg-black/60 border border-purple-900/50 backdrop-blur-xl flex flex-col shadow-[0_0_20px_rgba(149,0,255,0.15)] overflow-hidden">
        <div className="p-4 border-b border-purple-900/50 bg-black/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg text-cyan-400 font-bold tracking-widest uppercase flex items-center gap-2">
              BANDEJA
              {totalUnread > 0 && <span className="text-xs bg-green-500 text-black px-1.5 py-0.5 rounded-full font-bold">{totalUnread}</span>}
            </h2>
            <button onClick={() => loadChats()} className="p-1.5 text-gray-500 hover:text-cyan-400 transition-colors" title="Actualizar">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>

          {/* Filtros de canal */}
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1 no-scrollbar">
            {[
              ["all","TODOS",null],
              ["whatsapp","WA",<MessageCircle className="w-3 h-3"/>],
              ["messenger","FB",<MessageSquare className="w-3 h-3"/>],
              ["instagram","IG",<Instagram className="w-3 h-3"/>],
              ["telegram","TG",<Send className="w-3 h-3"/>]
            ].map(([val, label, icon]) => (
              <button key={val as string} onClick={() => setSelectedChannel(val as string)}
                className={`flex-1 min-w-[32px] py-1 text-[9px] font-mono tracking-wider border transition-colors flex items-center justify-center gap-1
                  ${selectedChannel === val
                    ? val === "whatsapp" ? "bg-green-950/80 border-green-400 text-green-300"
                    : val === "messenger" ? "bg-blue-950/80 border-blue-400 text-blue-300"
                    : val === "instagram" ? "bg-pink-950/80 border-pink-400 text-pink-300"
                    : val === "telegram" ? "bg-sky-950/80 border-sky-400 text-sky-300"
                    : "bg-purple-900/50 border-purple-400 text-white"
                    : "bg-black/40 border-gray-800 text-gray-500 hover:text-gray-300"}`}
              >{icon as any}{label as string}</button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar..." className="w-full bg-black border border-purple-900 text-white pl-9 pr-3 py-2 text-xs font-mono focus:border-cyan-400 outline-none transition-colors placeholder:text-gray-600" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 && (
            <div className="p-6 text-center text-gray-600 font-mono text-xs">SIN CONVERSACIONES</div>
          )}
          {filteredChats.map(chat => (
            <div key={chat.id} onClick={() => setActiveChatId(chat.id)}
              className={`p-3 border-b border-gray-800/50 cursor-pointer transition-all relative
                ${activeChatId === chat.id ? "bg-purple-900/30 border-l-2 border-l-cyan-400" : "hover:bg-gray-900/60"}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-900/40 border border-cyan-700/50 flex items-center justify-center flex-shrink-0 relative">
                  <span className="text-cyan-400 font-bold text-xs">{chat.avatar}</span>
                  {chat.botActive && <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 border border-purple-500"><Bot className="w-2.5 h-2.5 text-purple-400" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`font-mono text-xs truncate ${chat.unread > 0 ? "text-white font-bold" : "text-gray-300"}`}>{chat.name}</h3>
                    <span className={`text-[9px] flex-shrink-0 ml-1 ${chat.unread > 0 ? "text-green-400" : "text-gray-600"}`}>{chat.time}</span>
                  </div>
                  <p className={`text-[10px] truncate font-mono mb-1 ${chat.unread > 0 ? "text-gray-300" : "text-gray-600"}`}>{chat.lastMessage}</p>
                  <div className="flex items-center justify-between">
                    <ChannelBadge channel={chat.channel} />
                    {chat.unread > 0 && <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[9px] text-black font-bold">{chat.unread}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COL 2: Chat */}
      <div className="w-2/4 bg-black/60 border border-cyan-900/50 backdrop-blur-xl flex flex-col shadow-[0_0_20px_rgba(0,243,255,0.08)] overflow-hidden">
        {activeChat ? (
          <>
            {/* Header */}
            <div className="p-3 border-b border-cyan-900/50 bg-black/40 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-900/40 border border-purple-600/50 flex items-center justify-center">
                  <span className="text-purple-400 font-bold text-xs">{activeChat.avatar}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold font-mono text-sm">{activeChat.name}</h3>
                    <ChannelBadge channel={activeChat.channel} />
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-0.5"><Phone className="w-2.5 h-2.5" />+{activeChat.phone}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button className="p-1.5 bg-black border border-gray-800 text-gray-500 hover:text-cyan-400 hover:border-cyan-400 transition-colors" title="Asignar agente"><User className="w-4 h-4" /></button>
                <button className="p-1.5 bg-black border border-gray-800 text-gray-500 hover:text-purple-400 hover:border-purple-400 transition-colors" title="Configuración Bot"><Settings className="w-4 h-4" /></button>
                <button className="px-2 py-1 bg-black border border-red-900/50 text-red-500 hover:bg-red-900/30 transition-colors text-[9px] font-mono tracking-widest">CERRAR</button>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 bg-black/80 flex flex-col gap-3">
              <div className="text-center mb-2">
                <span className="text-[9px] text-gray-600 border border-gray-800 bg-black/50 px-3 py-1 rounded-full font-mono tracking-widest">HOY</span>
              </div>

              {(activeChat.messages || []).map((msg) => (
                <div key={msg.id} className={`flex flex-col max-w-[78%] ${msg.sender === "client" ? "self-start" : "self-end"}`}>
                  {msg.sender === "bot" && <span className="text-[9px] text-purple-400 font-mono mb-0.5 flex items-center gap-1"><Bot className="w-2.5 h-2.5" />AUTO-BOT</span>}
                  {msg.sender === "agent" && <span className="text-[9px] text-cyan-400 font-mono mb-0.5 self-end">AGENTE</span>}
                  <div className={`p-2.5 text-xs font-mono shadow-md relative
                    ${msg.sender === "client"
                      ? "bg-gray-800/80 text-white border-l-2 border-l-gray-500 rounded-r-xl rounded-bl-xl"
                      : msg.sender === "bot"
                      ? "bg-purple-900/30 text-purple-100 border-r-2 border-r-purple-500 rounded-l-xl rounded-br-xl"
                      : "bg-cyan-900/30 text-cyan-100 border-r-2 border-r-cyan-500 rounded-l-xl rounded-br-xl"}`}>
                    {msg.text}
                    <span className="text-[8px] text-gray-500 flex justify-end mt-1 items-center gap-1">
                      {msg.time}
                      {msg.sender !== "client" && (
                        msg.read
                          ? <CheckCheck className="w-3 h-3 text-cyan-400" />
                          : <Check className="w-3 h-3 text-gray-500" />
                      )}
                    </span>
                  </div>
                </div>
              ))}

              {typing && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-black/60 border-t border-cyan-900/50">
              <div className="flex gap-2">
                <button className="p-2.5 bg-black border border-gray-800 text-gray-500 hover:text-cyan-400 hover:border-cyan-400 transition-colors" title="Respuestas rápidas">
                  <Zap className="w-4 h-4" />
                </button>
                <input ref={inputRef} type="text" value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={`Responder a ${activeChat.name} vía ${activeChat.channel.toUpperCase()}...`}
                  className="flex-1 bg-black border border-cyan-900 text-white px-4 py-2 text-sm font-mono focus:border-cyan-400 outline-none transition-colors placeholder:text-gray-700" />
                <button onClick={handleSend} disabled={sending || !inputText.trim()}
                  className="px-5 bg-cyan-600 text-black font-bold font-mono text-xs tracking-widest hover:bg-cyan-400 transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(0,243,255,0.4)] disabled:opacity-40 disabled:cursor-not-allowed">
                  {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "..." : "ENVIAR"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600 font-mono gap-3">
            <Bot className="w-14 h-14 opacity-10" />
            <p className="text-xs tracking-widest uppercase">Seleccione un chat para comenzar</p>
          </div>
        )}
      </div>

      {/* COL 3: Ficha CRM */}
      <div className="w-1/4 bg-black/60 border border-purple-900/50 backdrop-blur-xl shadow-[0_0_20px_rgba(149,0,255,0.15)] flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-600 to-cyan-400" />

        {loadingClient ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Activity className="w-7 h-7 text-cyan-400 animate-spin mb-3" />
            <span className="text-cyan-400 font-mono text-[10px] tracking-widest animate-pulse">CRUZANDO CRM...</span>
          </div>
        ) : cData ? (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-cyan-900/50 pb-2">
              <UserCircle className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs text-cyan-400 font-mono tracking-widest">FICHA CRM</h2>
            </div>

            <div>
              <p className="text-[9px] text-gray-600 font-mono">CLIENTE #{cData.id}</p>
              <p className="text-base text-white font-medium leading-tight">{cData.nombre}</p>
              {cData.razonsocial && <p className="text-xs text-gray-400">{cData.razonsocial}</p>}
            </div>

            <div className="space-y-2.5 bg-black/40 border border-gray-800 p-3">
              <div className="flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[8px] text-gray-600 font-mono tracking-wider">DNI / CUIT</p>
                  <p className="text-gray-300 font-mono text-xs">{cData.documento || cData.cuit || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[8px] text-gray-600 font-mono tracking-wider">DOMICILIO</p>
                  <p className="text-gray-300 text-xs">{cData.calle || "Sin calle"} {cData.numero || ""}</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-gray-800 pt-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isBaja ? "bg-red-500" : "bg-green-500"}`} />
                  <span className={`text-[9px] font-mono font-bold ${isBaja ? "text-red-500" : "text-green-500"}`}>{isBaja ? "BAJA" : "ACTIVO"}</span>
                </div>
                <a href={`/hyperisp/clientes/${cData.id}`} target="_blank" rel="noopener noreferrer"
                  className="text-[9px] bg-purple-900/40 border border-purple-500/60 text-purple-300 hover:bg-purple-500 hover:text-white transition-colors font-mono px-2 py-1">
                  VER FICHA
                </a>
              </div>
            </div>

            <div className="bg-black/40 border border-gray-800 p-3">
              <p className="text-[8px] text-gray-600 font-mono tracking-wider mb-2">ESTADO DE CUENTA</p>
              <div className="flex items-end justify-between">
                <span className={`text-2xl font-bold font-mono ${saldo > 0 ? "text-red-500 drop-shadow-[0_0_5px_rgba(255,0,0,0.5)]" : "text-green-500 drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]"}`}>
                  ${saldo === 0 ? "0.00" : Number(saldo).toLocaleString("es-AR")}
                </span>
                <CreditCard className={`w-4 h-4 ${saldo > 0 ? "text-red-500/40" : "text-green-500/40"}`} />
              </div>
              {saldo > 0 && (
                <button className="w-full mt-2 bg-red-900/30 border border-red-500/60 text-red-400 py-1.5 font-mono text-[9px] tracking-widest hover:bg-red-500 hover:text-black transition-colors">
                  ENVIAR LINK DE PAGO
                </button>
              )}
            </div>

            {planes.length > 0 && (
              <div>
                <p className="text-[8px] text-gray-600 font-mono tracking-wider mb-2">SERVICIOS ACTIVOS</p>
                <div className="space-y-1.5">
                  {planes.map((p: any, i: number) => (
                    <div key={i} className="bg-gray-900/50 border border-gray-800 p-2 hover:border-cyan-900 transition-colors">
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="text-[10px] font-bold text-gray-200 font-mono truncate max-w-[70%]">{p.nombrePlan || "Servicio"}</span>
                        <span className={`text-[7px] border px-1 font-mono ${p.statusInt === "ACTIVO" ? "text-green-500 border-green-500/40" : "text-red-500 border-red-500/40"}`}>{p.statusInt || "N/A"}</span>
                      </div>
                      <p className="text-[8px] text-cyan-600 font-mono truncate">{p.nombreProducto || "Conectividad"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <UserCircle className="w-10 h-10 text-gray-700 mb-2" />
            <p className="text-gray-500 font-mono text-[10px] tracking-wider">NÚMERO NO REGISTRADO</p>
            <p className="text-gray-700 font-mono text-[9px] mt-1.5 max-w-[85%]">No hay Maestro asociado a +{activeChat.phone}</p>
            <button className="mt-4 border border-purple-500/60 text-purple-400 px-4 py-1.5 text-[9px] font-mono tracking-widest hover:bg-purple-500 hover:text-black transition-colors">
              ASOCIAR CLIENTE
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-700 font-mono text-[9px] tracking-widest text-center px-4">
            SELECCIONE UN CHAT PARA VER LA FICHA
          </div>
        )}
      </div>

    </div>
  );
}
