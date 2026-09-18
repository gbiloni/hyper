import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell, H1, H2, P, UL, CONTACTO_EMAIL } from "@/components/public/PublicShell";

export const metadata: Metadata = {
  title: "Eliminar mis datos",
  description: "Cómo pedir la eliminación de tus datos en HyperISP CRM.",
};

export default function EliminarDatosPage() {
  const asunto = encodeURIComponent("Solicitud de eliminación de datos - HyperISP CRM");
  return (
    <PublicShell>
      <H1>Eliminar mis datos</H1>
      <p className="mb-6 text-sm text-slate-500">Instrucciones para solicitar la eliminación de tus datos</p>

      <P>
        Si escribiste por WhatsApp a un proveedor que usa HyperISP CRM, o si sos operador de uno de ellos,
        podés pedir que eliminemos los datos que tenemos sobre vos.
      </P>

      <H2>Cómo pedirlo</H2>
      <UL>
        <li>
          Enviá un email a{" "}
          <a
            href={`mailto:${CONTACTO_EMAIL}?subject=${asunto}`}
            className="text-sky-400 hover:underline"
          >
            {CONTACTO_EMAIL}
          </a>{" "}
          con el asunto &quot;Solicitud de eliminación de datos&quot;.
        </li>
        <li>
          Indicá el número de teléfono (con código de país) o el usuario cuyos datos querés eliminar, y el
          proveedor con el que estabas en contacto, si lo sabés.
        </li>
        <li>
          Podemos pedirte que confirmes tu identidad antes de borrar nada, para evitar eliminaciones por error
          o por terceros.
        </li>
      </UL>

      <H2>Qué se elimina</H2>
      <P>
        Las conversaciones y mensajes asociados a ese número o usuario, y los datos de contacto que hayamos
        guardado. Si el dato también está en el sistema de gestión del proveedor, ese proveedor es quien
        decide sobre él y podemos derivarle tu pedido.
      </P>

      <H2>Plazo</H2>
      <P>Respondemos tu pedido y completamos la eliminación dentro de los 30 días.</P>

      <H2>Si conectaste una cuenta de WhatsApp Business</H2>
      <P>
        Además de pedirnos la eliminación, podés revocar el acceso de HyperISP en cualquier momento desde la
        configuración de tu negocio en Meta (Configuración del negocio → Integraciones → Apps conectadas).
      </P>

      <P>
        Más información en la{" "}
        <Link href="/privacidad" className="text-sky-400 hover:underline">
          Política de Privacidad
        </Link>
        .
      </P>
    </PublicShell>
  );
}
