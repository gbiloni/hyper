import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

// Solo lectura: consulta el estado de Calling/SIP de un número ya conectado
// (calling.status, sip.servers, webhook_delivery) sin tener que hacer el
// curl a mano como se hizo para diagnosticar el trunk de Issabel. No expone
// el token -- solo el resultado de /settings?fields=calling.
// Sin filtro de nodo: la pantalla unificada de Números administra las
// cuentas de todas las ciudades por igual, no solo la del nodo activo.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    const [rows]: any = await db.query(
      `SELECT identificador, token FROM crm_cuentas
       WHERE id = ? AND canal = 'whatsapp'`,
      [id]
    );
    if (!rows || rows.length === 0 || !rows[0].token) {
      return NextResponse.json({ error: "Número no encontrado o sin token guardado." }, { status: 404 });
    }

    const { identificador, token } = rows[0];
    const metaUrl = `https://graph.facebook.com/v21.0/${identificador}/settings?fields=calling`;
    const resMeta = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
    const data = await resMeta.json();

    if (!resMeta.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Error consultando Calling settings en Meta." },
        { status: resMeta.status }
      );
    }

    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("Error consultando calling settings:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
