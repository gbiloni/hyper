import { NextResponse } from "next/server";
import crypto from "crypto";
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

    // Autenticación local contra la tabla usuario de la base "hyper" — NO
    // delegar a un backend Java por-nodo (ver src/app/api/auth/login/route.js,
    // que ya hacía esto bien: esta ruta era una copia mal aplicada del flujo
    // de Hyperisp, que sí necesita un nodo activo porque cada ciudad tiene
    // su propio backend Java; Hypercrm no tiene ese concepto para loguear).
    const [rows]: any = await pool.query(
      `SELECT id, username, password, nombre, email, rol, activo, first_login
       FROM usuario WHERE username = ?`,
      [username]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Credenciales incorrectas o usuario inactivo" },
        { status: 401 }
      );
    }

    const user = rows[0];
    if (!user.activo) {
      return NextResponse.json(
        { success: false, message: "Credenciales incorrectas o usuario inactivo" },
        { status: 401 }
      );
    }

    const dbPassword = user.password;
    const md5Password = crypto.createHash("md5").update(password).digest("hex");

    // Acepta MD5 (estándar) o texto plano (compatibilidad con cuentas antiguas).
    const valid = dbPassword === md5Password || dbPassword === password;
    if (!valid) {
      return NextResponse.json(
        { success: false, message: "Credenciales incorrectas o usuario inactivo" },
        { status: 401 }
      );
    }

    // Registrar actividad de login
    try {
      const ip = req.headers.get("x-forwarded-for") || "unknown";
      await pool.query(
        "INSERT INTO log_actividad (usuario_id, accion, entidad, detalle) VALUES (?, ?, ?, ?)",
        [user.id, "LOGIN", "usuario", JSON.stringify({ ip, source: "hypercrm-login" })]
      );
    } catch (dbError) {
      console.error("Error registrando log_actividad:", dbError);
    }

    const firstLogin = user.first_login === 1 || user.first_login === true || user.first_login === null;
    const esAdmin = user.rol === "ADMIN" || (user.rol && String(user.rol).toUpperCase() === "ADMINISTRADOR");

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        es_admin: esAdmin,
        first_login: firstLogin,
        roles: [],
      },
    });

    response.cookies.set({
      name: "hyperisp_session",
      value: JSON.stringify({
        id: user.id,
        nombre: user.nombre,
        es_admin: esAdmin,
        first_login: firstLogin,
        username: user.username,
        roles: [],
      }),
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 1 día
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
