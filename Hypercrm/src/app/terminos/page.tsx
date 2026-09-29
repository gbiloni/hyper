import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell, H1, H2, P, UL, CONTACTO_EMAIL, TITULAR } from "@/components/public/PublicShell";

export const metadata: Metadata = {
  title: "Términos del Servicio",
  description: "Condiciones de uso de HyperISP CRM.",
};

export default function TerminosPage() {
  return (
    <PublicShell>
      <H1>Términos del Servicio</H1>
      <p className="mb-6 text-sm text-slate-500">Última actualización: septiembre de 2026</p>

      <H2>1. El servicio</H2>
      <P>
        HyperISP CRM es una plataforma para que proveedores de internet atiendan a sus clientes por WhatsApp
        y otros canales de mensajería, con una bandeja compartida y un bot configurable. Al usarlo aceptás
        estos términos.
      </P>
      <P>
        El servicio lo presta {TITULAR}, titular de la marca Hyper ISP (HyperISP), con domicilio en Mar del
        Plata, Buenos Aires, Argentina.
      </P>

      <H2>2. Cuentas y acceso</H2>
      <UL>
        <li>El acceso es solo para operadores autorizados por el proveedor (el Cliente).</li>
        <li>Sos responsable de mantener seguras tus credenciales y de lo que se haga con tu usuario.</li>
        <li>
          El Cliente autoriza a HyperISP a operar su cuenta de WhatsApp Business únicamente para prestar el
          servicio, mediante los permisos que otorga en el flujo oficial de Meta. Puede revocar ese acceso
          en cualquier momento desde su cuenta de Meta.
        </li>
      </UL>

      <H2>3. Uso aceptable</H2>
      <P>
        Cumplir las{" "}
        <a
          href="https://www.whatsapp.com/legal/business-policy"
          className="text-sky-400 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Políticas de WhatsApp Business
        </a>{" "}
        y los términos de Meta. Está prohibido enviar spam, mensajes sin consentimiento, contenido ilegal o
        engañoso, o usar el servicio para vulnerar derechos de terceros. Podemos suspender el acceso ante un
        uso que ponga en riesgo el servicio o la cuenta de WhatsApp del Cliente.
      </P>

      <H2>4. Datos</H2>
      <P>
        El tratamiento de datos se rige por la{" "}
        <Link href="/privacidad" className="text-sky-400 hover:underline">
          Política de Privacidad
        </Link>
        . El Cliente es responsable de contar con la base legal (por ejemplo, consentimiento) para escribirle
        a las personas que contacta por WhatsApp.
      </P>

      <H2>5. Disponibilidad y responsabilidad</H2>
      <P>
        El servicio depende de terceros (Meta, proveedores de internet y de alojamiento) y se presta tal
        como está, sin garantía de disponibilidad ininterrumpida. En la medida que la ley lo permita,
        HyperISP no responde por daños indirectos ni por interrupciones causadas por terceros.
      </P>

      <H2>6. Cambios y contacto</H2>
      <P>
        Podemos actualizar estos términos y publicaremos la versión vigente en esta página. Consultas:{" "}
        <a href={`mailto:${CONTACTO_EMAIL}`} className="text-sky-400 hover:underline">
          {CONTACTO_EMAIL}
        </a>
        .
      </P>
    </PublicShell>
  );
}
