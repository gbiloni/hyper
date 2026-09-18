import Link from "next/link";
import type { ReactNode } from "react";

export const CONTACTO_EMAIL = "gbiloni@gmail.com";

const NAV = [
  { href: "/plataforma", label: "Plataforma" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/terminos", label: "Términos" },
  { href: "/eliminar-datos", label: "Eliminar datos" },
];

// Marco común de las páginas públicas (sin login): landing, privacidad,
// términos y eliminación de datos. Server component, sin estado.
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200">
      <header className="border-b border-sky-500/20 bg-[#0f172a]/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link href="/plataforma" className="text-lg font-bold tracking-widest text-sky-400">
            HYPER<span className="text-amber-400">ISP</span> CRM
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-slate-400">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-sky-400 transition-colors">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">{children}</main>

      <footer className="border-t border-sky-500/10 py-8 text-center text-xs text-slate-500">
        <p>
          HyperISP — Mar del Plata, Buenos Aires, Argentina ·{" "}
          <a href={`mailto:${CONTACTO_EMAIL}`} className="text-sky-400 hover:underline">
            {CONTACTO_EMAIL}
          </a>
        </p>
        <p className="mt-1">© {new Date().getFullYear()} HyperISP. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return <h1 className="mb-2 text-3xl font-bold text-slate-100">{children}</h1>;
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-10 text-xl font-semibold text-sky-400">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mb-3 leading-relaxed text-slate-300">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="mb-3 list-disc space-y-1 pl-6 text-slate-300">{children}</ul>;
}
