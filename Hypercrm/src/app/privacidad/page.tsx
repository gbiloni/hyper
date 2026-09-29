import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell, H1, H2, P, UL, CONTACTO_EMAIL, TITULAR } from "@/components/public/PublicShell";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Qué datos trata HyperISP CRM, para qué, y cómo pedir su eliminación.",
};

export default function PrivacidadPage() {
  return (
    <PublicShell>
      <H1>Política de Privacidad</H1>
      <p className="mb-6 text-sm text-slate-500">Última actualización: septiembre de 2026</p>

      <P>
        Esta política describe cómo HyperISP CRM (&quot;HyperISP&quot;, &quot;nosotros&quot;) trata los datos
        cuando un proveedor de internet (&quot;el Cliente&quot;) usa la plataforma para atender a sus propios
        clientes por WhatsApp y otros canales de mensajería. HyperISP opera en Mar del Plata, Buenos Aires,
        Argentina.
      </P>

      <H2>1. Quién es responsable</H2>
      <P>
        Hyper ISP (HyperISP) es una marca de {TITULAR}, titular del servicio y responsable de esta política.
      </P>
      <P>
        Respecto de los datos de las personas que le escriben al Cliente, el Cliente decide para qué se usan
        y HyperISP los trata en su nombre para prestarle el servicio. Para consultas sobre esta política:{" "}
        <a href={`mailto:${CONTACTO_EMAIL}`} className="text-sky-400 hover:underline">
          {CONTACTO_EMAIL}
        </a>
        .
      </P>

      <H2>2. Qué datos tratamos</H2>
      <UL>
        <li>
          <strong>Mensajes de WhatsApp:</strong> número de teléfono del remitente, contenido del mensaje,
          fecha y estado de entrega (enviado, entregado, leído), tanto entrantes como salientes.
        </li>
        <li>
          <strong>Datos de la cuenta de WhatsApp Business del Cliente:</strong> identificador de la cuenta
          (WABA), identificador y nombre visible del número, plantillas de mensaje y su estado, y las
          credenciales de acceso que el Cliente nos autoriza a usar.
        </li>
        <li>
          <strong>Datos de los operadores del Cliente:</strong> usuario y datos de sesión para entrar al
          sistema.
        </li>
        <li>
          <strong>Datos del cliente final consultados en el sistema del Cliente:</strong> por ejemplo nombre
          y saldo, solo para responder una consulta puntual. No los copiamos de forma permanente.
        </li>
      </UL>

      <H2>3. Para qué los usamos</H2>
      <UL>
        <li>Recibir y enviar mensajes por la API oficial de WhatsApp Business Platform de Meta.</li>
        <li>Mostrar las conversaciones a los agentes del Cliente y responder con el bot que el Cliente configura.</li>
        <li>Mantener el historial de atención y las estadísticas de uso del servicio.</li>
        <li>Seguridad, prevención de abuso y soporte técnico.</li>
      </UL>
      <P>
        No vendemos datos, no los compartimos con terceros con fines comerciales y no los usamos para
        publicidad ni para entrenar modelos propios.
      </P>

      <H2>4. Con quién los compartimos</H2>
      <P>
        Solo con los proveedores técnicos necesarios para prestar el servicio (por ejemplo, Meta Platforms
        para el envío y recepción de mensajes de WhatsApp, y el proveedor de alojamiento del servidor).
        Los datos de cada Cliente están separados de los de los demás Clientes.
      </P>

      <H2>5. Seguridad</H2>
      <P>
        El acceso al sistema requiere autenticación, las comunicaciones usan HTTPS, los mensajes que llegan
        desde Meta se validan con firma criptográfica y las credenciales de acceso a las cuentas no se
        muestran en la interfaz.
      </P>

      <H2>6. Conservación y eliminación</H2>
      <P>
        Conservamos los datos mientras el Cliente use el servicio o hasta que se pida su eliminación. Podés
        pedir la eliminación de tus datos siguiendo las{" "}
        <Link href="/eliminar-datos" className="text-sky-400 hover:underline">
          instrucciones para eliminar datos
        </Link>
        .
      </P>

      <H2>7. Tus derechos</H2>
      <P>
        Podés pedir acceso, rectificación o eliminación de tus datos personales escribiendo a{" "}
        <a href={`mailto:${CONTACTO_EMAIL}`} className="text-sky-400 hover:underline">
          {CONTACTO_EMAIL}
        </a>
        . En Argentina, la Agencia de Acceso a la Información Pública es el órgano de control de la Ley 25.326
        de Protección de Datos Personales.
      </P>

      <H2>8. Cambios</H2>
      <P>Si actualizamos esta política, publicaremos la nueva versión en esta misma página con su fecha.</P>
    </PublicShell>
  );
}
