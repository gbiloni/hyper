import { NextResponse } from "next/server";
import api from "@/lib/api";

import pool from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Usuario y contraseña requeridos" },
        { status: 400 }
      );
    }

    // Delegamos la autenticación al backend Java (API3)
    try {
      const res = await api.post("/auth/login", { username, password });
      
      if (res.data && res.data.success) {
        const user = res.data.user;
        
        // Registrar actividad de login
        try {
          const ip = req.headers.get("x-forwarded-for") || "unknown";
          await pool.query(
            "INSERT INTO log_actividad (usuario_id, accion, entidad, detalle) VALUES ((SELECT id FROM usuario WHERE username = ? LIMIT 1), ?, ?, ?)",
            [user.username || user.id, "LOGIN", "usuario", JSON.stringify({ ip, source: "hyperisp-portal" })]
          );
        } catch (dbError) {
          console.error("Error registrando log_actividad:", dbError);
        }

        // Determinar first_login
        const firstLogin = user.first_login === true || user.first_login === 1 || user.first_login === "true" || user.first_login === null || user.first_login === undefined;

        const response = NextResponse.json({
          success: true,
          user: { ...user, first_login: firstLogin },
        });

        // Seteamos cookie de sesión con datos del usuario
        const sessionData = JSON.stringify({
          id: user.id,
          nombre: user.nombre,
          es_admin: user.es_admin || false,
          first_login: firstLogin,
          username: username,
          roles: user.roles || [], // <-- Added for RBAC
        });

        response.cookies.set({
          name: "hyperisp_session",
          value: sessionData,
          httpOnly: true,
          path: "/",
          maxAge: 60 * 60 * 24, // 1 día
          sameSite: "lax",
        });

        return response;
      } else {
        return NextResponse.json(
          { success: false, message: "Credenciales incorrectas o usuario inactivo" },
          { status: 401 }
        );
      }
    } catch (apiError: any) {
      console.error("API3 Login error:", apiError?.response?.data || apiError.message);
      return NextResponse.json(
        { success: false, message: "Credenciales incorrectas o usuario inactivo" },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

