import { cookies } from "next/headers";

// Mismo parsing de sesión que ya usaba api/telefonia/credenciales/route.ts,
// extraído para no repetirlo en cada endpoint nuevo de gestión de telefonía.
export async function getSessionContext(): Promise<{ idUsuario: number; idNodo: number } | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("hyperisp_session");
  if (!session?.value) return null;

  let idUsuario: number | null = null;
  try {
    idUsuario = JSON.parse(session.value)?.id ?? null;
  } catch {
    // Cookie con formato viejo (solo el id como string plano)
    idUsuario = Number(session.value) || null;
  }
  if (!idUsuario) return null;

  const idNodo = parseInt(cookieStore.get("hyperisp_active_node_id")?.value || "1", 10);
  return { idUsuario, idNodo };
}
