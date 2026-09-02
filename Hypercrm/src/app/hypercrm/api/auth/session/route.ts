import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("hyperisp_session");
  
  if (!session || !session.value) {
    return NextResponse.json({ isLoggedIn: false });
  }

  // Parsear datos de sesión (JSON con id, nombre, es_admin, first_login, username)
  try {
    const data = JSON.parse(session.value);
    return NextResponse.json({
      isLoggedIn: true,
      user: {
        id: data.id,
        nombre: data.nombre,
        es_admin: data.es_admin || false,
        first_login: data.first_login ?? true,
        username: data.username || data.id,
        roles: data.roles || [],
      },
    });
  } catch {
    // Cookie con formato viejo (solo el user.id como string)
    return NextResponse.json({
      isLoggedIn: true,
      user: {
        id: session.value,
        first_login: true, // Asumir que necesita cambiar clave si no hay datos
      },
    });
  }
}
