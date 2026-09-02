import { NextResponse } from "next/server";
import api from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await api.get("/sistema/info");
    if (res.data && res.data.success !== false) {
      return NextResponse.json(res.data);
    }
    throw new Error("Respuesta inválida");
  } catch (error: any) {
    console.error("=== ERROR FETCHING SYSTEM INFO VIA API3, USANDO FALLBACK ===", error.message);
    
    // Fallback seguro: devolvemos un JSON válido en lugar de un error 500
    // para que no rompa el Sidebar con el "Unexpected token <"
    return NextResponse.json({
      success: true,
      data: {
        nombre_empresa: "HyperISP (Fallback)",
        version: "3.0.0",
        logo_url: "/hyper.ico"
      }
    });
  }
}
