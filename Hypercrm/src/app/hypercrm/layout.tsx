// Fuerza render dinámico para todo el árbol /hypercrm (multi-tenant vía
// cookie de nodo, datos siempre en vivo). Se escapa acá y no en el layout
// raíz para no romper el pre-render estático de los especiales de Next.js
// (/_global-error, /_not-found) — ver commit relacionado con el deploy de
// WhatsApp Automation (2026-09-01).
export const dynamic = "force-dynamic";

export default function HypercrmLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
