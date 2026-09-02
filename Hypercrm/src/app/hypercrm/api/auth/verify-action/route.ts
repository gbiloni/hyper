import { NextResponse } from "next/server";
import api from "@/lib/api";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const { username, password, actionName, targetId } = await req.json();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "Local IP";
    const userAgent = headersList.get("user-agent") || "Unknown Client";

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Usuario y contraseña requeridos" },
        { status: 400 }
      );
    }

    // Delegamos la verificación al backend Java (API3)
    try {
      const res = await api.post("/auth/login", { username, password });
      
      if (res.data && res.data.success) {
        const user = res.data.user;
        
        // Validar si es administrador usando la respuesta de Java
        const isAdmin = user.es_admin === 1 || user.es_admin === true || String(user.es_admin).toLowerCase() === 'true';

        if (!isAdmin) {
          return NextResponse.json(
            { success: false, message: "Acceso denegado: Se requiere rol de Administrador para realizar esta acción." },
            { status: 403 }
          );
        }

        // REGISTRO DE AUDITORÍA
        const auditLog = `[AUDIT LOG] Usuario: ${user.id} | Acción: ${actionName} | ID Afectado: ${targetId} | IP: ${ip} | Navegador/Terminal: ${userAgent} | Fecha: ${new Date().toISOString()}`;
        console.log(auditLog);

        // Al usar API3, la auditoría también se podría delegar al backend en el futuro
        // invocando un endpoint como POST /api3/auditoria

        return NextResponse.json({ success: true, user: user.id });
      } else {
        return NextResponse.json(
          { success: false, message: "Credenciales incorrectas" },
          { status: 401 }
        );
      }
    } catch (apiError: any) {
      console.error("API3 Verify Action error:", apiError?.response?.data || apiError.message);
      return NextResponse.json(
        { success: false, message: "Credenciales incorrectas" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Action Auth error:", error);
    return NextResponse.json(
      { success: false, message: "Error interno verificando credenciales" },
      { status: 500 }
    );
  }
}
