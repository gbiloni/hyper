import { NextResponse } from "next/server";
import api from "@/lib/api";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { username, current_password, new_password } = body;

    if (!username || !current_password || !new_password) {
      return NextResponse.json(
        { success: false, message: "Faltan datos requeridos" },
        { status: 400 }
      );
    }

    const res = await api.put("/auth/change-password", {
      username,
      current_password,
      new_password,
    });

    return NextResponse.json(res.data);
  } catch (error: any) {
    const msg = error?.response?.data?.message || "Error al cambiar la clave";
    const status = error?.response?.status || 500;
    return NextResponse.json({ success: false, message: msg }, { status });
  }
}
