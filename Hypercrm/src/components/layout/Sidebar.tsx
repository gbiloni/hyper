"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, Map as MapIcon, Settings, History, X, ChevronDown, ChevronRight, MessageSquare, LogOut, Ticket, Wrench, Server, Palette, Phone } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ThemeSettingsModal from "../ThemeSettingsModal";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onOpenThemeModal: () => void;
}

export default function Sidebar({ isOpen, setIsOpen, onOpenThemeModal }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasRole } = useAuth() as any;
  const [sysName, setSysName] = useState<string>("");
  const [sysLogo, setSysLogo] = useState<string>("");
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    AVL: false,
    Clientes: true
  });

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const res = await fetch("/hypercrm/api/system/info");
        if (res.ok) {
          const json = await res.json();
          const nombre = json?.data?.nombre_empresa || json?.nombre_empresa;
          const logo = json?.data?.logo_empresa || json?.logo_empresa;
          if (nombre) {
            setSysName(nombre.trim());
            document.title = `${nombre.trim()} | Hyper CRM`;
          }
          if (logo) {
            setSysLogo(logo);
          }
        }
      } catch (e) { }
    };
    fetchEmpresa();
  }, []);

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({ [name]: !prev[name] }));
  };

  const handleLogout = async () => {
    try {
      await fetch('/hypercrm/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    // Navegación dura para enviar a la landing page y resetear estados
    window.location.href = "/login";
  };

  const navigation = [
    { name: "Dashboard", href: "/hypercrm/dashboard", icon: LayoutDashboard },
    { name: "WhatsApp CRM", href: "/hypercrm/soporte", icon: MessageSquare, newTab: true },
    { name: "Ciudades", href: "/hypercrm/ciudades", icon: MapIcon },
    // Visible para todos los usuarios logueados (no solo admin): un agente
    // sin rol admin entra acá para consultar su propio interno. El CRUD de
    // internos/colas dentro de la página sigue siendo admin-only.
    { name: "Telefonía", href: "/hypercrm/settings/telefonia", icon: Phone },
    ...(hasRole && hasRole('ADMIN') ? [{
      name: "Configuración",
      icon: Settings,
      children: [
        { name: "Números de WhatsApp", href: "/hypercrm/numeros" },
        { name: "Bot Automático", href: "/hypercrm/settings/bot" },
        { name: "WhatsApp", href: "/hypercrm/settings/whatsapp" },
        { name: "Telegram", href: "/hypercrm/settings/telegram" },
      ]
    }] : []),
  ];


  return (
    <div className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col overflow-hidden bg-background-panel text-foreground transition-transform duration-300 xl:relative xl:translate-x-0 border-r border-[var(--primary)]/20 ${isOpen ? "translate-x-0 shadow-2xl shadow-black/50" : "-translate-x-full"}`}>
      {/* Orbes difuminados detrás del vidrio (Liquid Glass) */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full bg-[var(--primary)] opacity-50 blur-[50px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-[var(--accent)] opacity-35 blur-[50px]" />

      <div className="relative flex h-16 items-center justify-between border-b border-white/10 px-4 backdrop-blur-md">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src={sysLogo || "/hyper.ico"}
            alt={sysName || "Hyper ISP"}
            style={{ height: '32px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 6px var(--glow-primary))' }}
          />
          <div className="flex flex-col">
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1.1 }}>
              <span style={{ color: 'var(--primary)', textShadow: '0 0 8px var(--glow-primary)' }}>Hyper</span>
              {' '}
              <span style={{ color: 'var(--accent)', textShadow: '0 0 8px var(--glow-primary)' }}>CRM</span>
            </h1>
            {sysName && (
              <span className="text-[0.65rem] text-[var(--text-muted)] font-mono tracking-widest uppercase mt-0.5 truncate max-w-[120px]" title={sysName}>
                {sysName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleLogout}
            type="button"
            title="Cerrar Sesión"
            className="rounded-full p-2 text-gray-400 hover:text-accent-red hover:bg-violet-base/40 focus:outline-none transition-colors"
          >
            <span className="sr-only">Cerrar Sesión</span>
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
          <button className="xl:hidden text-gray-400 hover:text-white transition-colors" onClick={() => setIsOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto py-4">
        <nav className="space-y-2 px-3">
          {navigation.map((item) => {
            if (item.children) {
              const isChildActive = item.children.some(child => pathname === child.href);
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`group w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium backdrop-blur-md transition-all duration-300 ${isChildActive
                      ? "lg-active bg-[var(--primary)]/[0.18] text-[var(--text-main)] border border-[var(--primary)]/45"
                      : "text-[var(--text-muted)] border border-transparent hover:bg-white/[0.06] hover:text-[var(--text-main)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      }`}
                  >
                    <div className="flex items-center">
                      <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${isChildActive ? "text-[var(--cta)]" : "text-[var(--text-muted)] group-hover:text-[var(--cta)]"}`} aria-hidden="true" />
                      {item.name}
                    </div>
                    {openMenus[item.name] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {openMenus[item.name] && (
                    <div className="pl-10 space-y-1 mt-1">
                      {item.children.map(child => {
                        const isActive = pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex justify-between items-center rounded-xl px-3 py-2 text-sm font-medium backdrop-blur-md transition-all duration-300 ${isActive
                              ? "lg-active bg-[var(--primary)]/[0.18] text-[var(--text-main)] border border-[var(--primary)]/45"
                              : "text-[var(--text-muted)] border border-transparent hover:bg-white/[0.06] hover:text-[var(--text-main)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                              }`}
                          >
                            <span>{child.name}</span>
                            {(child as any).badge && (
                              <span className="inline-flex items-center rounded-md bg-[#00f3ff]/15 px-1.5 py-0.5 text-[0.65rem] font-bold text-[#00f3ff] border border-[#00f3ff]/30 shadow-[0_0_8px_rgba(0,243,255,0.2)] tracking-wider">
                                {(child as any).badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                {...((item as any).newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={`group flex justify-between items-center rounded-xl px-3 py-2 text-sm font-medium backdrop-blur-md transition-all duration-300 ${isActive
                  ? "lg-active bg-[var(--primary)]/[0.18] text-[var(--text-main)] border border-[var(--primary)]/45"
                  : "text-[var(--text-muted)] border border-transparent hover:bg-white/[0.06] hover:text-[var(--text-main)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  }`}
              >
                <div className="flex items-center">
                  <item.icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${isActive ? "text-[var(--cta)]" : "text-[var(--text-muted)] group-hover:text-[var(--cta)]"
                      }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </div>

                {(item as any).badge && (
                  <span className="inline-flex items-center rounded-md bg-[#00f3ff]/15 px-1.5 py-0.5 text-[0.65rem] font-bold text-[#00f3ff] border border-[#00f3ff]/30 shadow-[0_0_8px_rgba(0,243,255,0.2)] tracking-wider">
                    {(item as any).badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="relative border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 backdrop-blur-md">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/30 text-sm font-medium text-[var(--primary)] uppercase">
            {(user as any)?.nombre ? (user as any).nombre.charAt(0) : (user as any)?.username ? (user as any).username.charAt(0) : "U"}
          </div>
          <div className="flex flex-col truncate flex-1">
            <p className="text-sm font-medium text-[var(--text-main)] truncate" title={(user as any)?.nombre || (user as any)?.username || "Usuario"}>
              {(user as any)?.nombre || (user as any)?.username || "Usuario"}
            </p>
            <p className="text-xs font-medium text-gray-400 truncate" title={(user as any)?.rol === 'ADMIN' ? 'Administrador' : 'Usuario'}>
              {(user as any)?.rol === 'ADMIN' ? 'Administrador' : 'Usuario'}
            </p>
          </div>
          <button
            onClick={onOpenThemeModal}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-white/10 transition-colors"
            title="Cambiar Tema"
          >
            <Palette className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
