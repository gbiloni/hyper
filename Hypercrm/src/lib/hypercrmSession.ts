import { cookies } from "next/headers";

// Mismo parsing de sesión que ya usaba api/telefonia/credenciales/route.ts,
// extraído para no repetirlo en cada endpoint nuevo de gestión de telefonía.
// esAdmin viaja en la misma cookie (la setea api/auth/login) -- lo devolvemos
// acá para que cada endpoint de telefonía decida qué permitir sin volver a
// tocar la cookie.
export async function getSessionContext(): Promise<{ idUsuario: number; idNodo: number; esAdmin: boolean } | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("hyperisp_session");
  if (!session?.value) return null;

  let idUsuario: number | null = null;
  let esAdmin = false;
  try {
    const parsed = JSON.parse(session.value);
    idUsuario = parsed?.id ?? null;
    esAdmin = parsed?.es_admin === true;
  } catch {
    // Cookie con formato viejo (solo el id como string plano) -- sin rol.
    idUsuario = Number(session.value) || null;
  }
  if (!idUsuario) return null;

  const idNodo = parseInt(cookieStore.get("hyperisp_active_node_id")?.value || "1", 10);
  return { idUsuario, idNodo, esAdmin };
}
