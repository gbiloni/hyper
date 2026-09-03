import { NextResponse } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";

export async function PUT(req: Request) {
  try {
    const { username, current_password, new_password } = await req.json();

    if (!username || !current_password || !new_password) {
      return NextResponse.json(
        { success: false, message: "Faltan datos requeridos" },
        { status: 400 }
      );
    }
    if (String(new_password).length < 4) {
      return NextResponse.json(
        { success: false, message: "La nueva clave debe tener al menos 4 caracteres" },
        { status: 400 }
      );
    }

    // Misma base local que /hypercrm/api/auth/login — no delegar al Java de
    // un nodo (ver hypercrm-login-roto en memoria).
    const [rows]: any = await pool.query(
      "SELECT id, password, activo FROM usuario WHERE username = ?",
      [username]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const user = rows[0];
    if (!user.activo) {
      return NextResponse.json(
        { success: false, message: "Usuario desactivado" },
        { status: 403 }
      );
    }

    const dbPassword = user.password;
    const md5Current = crypto.createHash("md5").update(current_password).digest("hex");
    const valid = dbPassword === current_password || dbPassword === md5Current;

    if (!valid) {
      return NextResponse.json(
        { success: false, message: "La clave actual es incorrecta" },
        { status: 401 }
      );
    }

    const md5New = crypto.createHash("md5").update(new_password).digest("hex");
    await pool.query("UPDATE usuario SET password = ?, first_login = 0 WHERE id = ?", [md5New, user.id]);

    return NextResponse.json({ success: true, message: "Clave actualizada correctamente" });
  } catch (error) {
    console.error("Error en change-password:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
