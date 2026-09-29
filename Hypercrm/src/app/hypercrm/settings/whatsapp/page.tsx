import { redirect } from "next/navigation";

// La gestión de números de WhatsApp (alta manual, OAuth de Meta, auto-sync,
// estado de Calling/SIP) se unificó con el resto de los canales en la
// pantalla de Números -- ver /hypercrm/numeros/page.tsx.
export default function WhatsappSettingsRedirect() {
  redirect("/hypercrm/numeros");
}
