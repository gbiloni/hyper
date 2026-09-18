import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell, H1, H2, P, UL, CONTACTO_EMAIL } from "@/components/public/PublicShell";

export const metadata: Metadata = {
  title: "Plataforma de atención por WhatsApp para proveedores de internet",
  description:
    "HyperISP CRM: bandeja de atención por WhatsApp, bot automático y consulta de datos del cliente para proveedores de internet (ISP).",
};

export default function PlataformaPage() {
  return (
    <PublicShell>
      <H1>HyperISP CRM</H1>
      <p className="mb-8 text-lg text-slate-400">
        Atención al cliente por WhatsApp para proveedores de internet (ISP).
      </p>

      <H2>Qué es</H2>
      <P>
        HyperISP CRM es una plataforma en la nube (SaaS) que permite a un proveedor de internet atender a
        sus clientes por WhatsApp desde una bandeja compartida, con un bot opcional para las consultas
        repetitivas. Cada proveedor (ciudad o sucursal) conecta su propio número de WhatsApp Business y
        sigue pudiendo usar la app WhatsApp Business en su teléfono al mismo tiempo.
      </P>

      <H2>Qué hace</H2>
      <UL>
        <li>
          <strong>Bandeja de atención:</strong> los agentes leen y responden los mensajes de WhatsApp de sus
          clientes desde el navegador, con el historial completo de cada conversación.
        </li>
        <li>
          <strong>Bot automático (opcional):</strong> responde preguntas simples según reglas que cada
          proveedor configura, por ejemplo saldo, horarios de atención o estado del servicio. Si el cliente
          necesita a una persona, la conversación pasa a un agente.
        </li>
        <li>
          <strong>Datos del cliente:</strong> el bot y los agentes consultan la ficha del cliente en el
          sistema de gestión del propio proveedor para responder con información real.
        </li>
        <li>
          <strong>Convivencia con la app del teléfono:</strong> lo que el proveedor escribe desde su
          teléfono también queda registrado en la conversación del CRM.
        </li>
        <li>
          <strong>Gestión de números:</strong> alta de números de WhatsApp Business por proveedor, estado de
          la cuenta y plantillas de mensaje aprobadas.
        </li>
      </UL>

      <H2>Cómo se conecta con WhatsApp</H2>
      <P>
        HyperISP usa la API oficial de WhatsApp Business Platform (Cloud API) de Meta. Cada proveedor
        autoriza el acceso a su propia cuenta de WhatsApp Business mediante el flujo oficial de Embedded
        Signup de Meta. HyperISP solo actúa en nombre del proveedor que lo autorizó y únicamente sobre su
        propia cuenta y sus propias conversaciones.
      </P>

      <H2>Datos y privacidad</H2>
      <P>
        Los datos de cada proveedor están separados de los de los demás. No vendemos ni compartimos datos con
        terceros ni los usamos para publicidad. Más detalle en la{" "}
        <Link href="/privacidad" className="text-sky-400 hover:underline">
          Política de Privacidad
        </Link>
        , los{" "}
        <Link href="/terminos" className="text-sky-400 hover:underline">
          Términos del Servicio
        </Link>{" "}
        y las{" "}
        <Link href="/eliminar-datos" className="text-sky-400 hover:underline">
          instrucciones para eliminar tus datos
        </Link>
        .
      </P>

      <H2>Contacto</H2>
      <P>
        HyperISP — Mar del Plata, Buenos Aires, Argentina.
        <br />
        Email:{" "}
        <a href={`mailto:${CONTACTO_EMAIL}`} className="text-sky-400 hover:underline">
          {CONTACTO_EMAIL}
        </a>
      </P>

      <div className="mt-12 rounded-lg border border-sky-500/20 bg-[#0f172a]/60 p-5">
        <h2 className="mb-2 text-lg font-semibold text-slate-100">In English</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          HyperISP CRM is a SaaS platform for internet service providers. Each provider connects its own
          WhatsApp Business number through Meta&apos;s Embedded Signup and uses a shared inbox to read and
          answer its own customers&apos; WhatsApp messages through the WhatsApp Cloud API, with an optional
          rule-based bot. Providers can keep using the WhatsApp Business app on their phone at the same time
          (coexistence). We only process platform data on behalf of the provider that authorized it, keep each
          provider&apos;s data separated, and do not sell or share it. Contact: {CONTACTO_EMAIL}.
        </p>
      </div>
    </PublicShell>
  );
}
