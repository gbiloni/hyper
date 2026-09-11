import { NextResponse } from "next/server";
import db from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Solo lectura: consulta el estado de Calling/SIP de un número ya conectado
// (calling.status, sip.servers, webhook_delivery) sin tener que hacer el
// curl a mano como se hizo para diagnosticar el trunk de Issabel. No expone
// el token -- solo el resultado de /settings?fields=calling.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const idNodoStr = cookieStore.get("hyperisp_active_node_id")?.value;
    const idNodo = idNodoStr ? parseInt(idNodoStr, 10) : 1;

    const [rows]: any = await db.query(
      `SELECT identificador, token FROM crm_cuentas
       WHERE id = ? AND id_nodo = ? AND canal = 'whatsapp'`,
      [id, idNodo]
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
