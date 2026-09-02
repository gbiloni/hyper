// Mismo motivo que src/app/hypercrm/layout.tsx: escapa force-dynamic del
// layout raíz para no romper el pre-render de /_global-error y /_not-found.
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
