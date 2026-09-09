// Conversión de números móviles argentinos al formato que la Cloud API de
// Meta espera en el campo "to" al ENVIAR (distinto del que llega en los
// webhooks). WhatsApp entrega/guarda el número con el prefijo móvil "9"
// (549 + código de área + abonado), pero para mandar mensajes Meta espera
// el formato viejo con "15" en vez del "9" (54 + código de área + 15 +
// abonado). Sin esto, Meta devuelve "(#131030) Recipient phone number not
// in allowed list" aunque el número esté bien cargado en la cuenta.
//
// OJO: asume código de área de 3 dígitos (cubre Mar del Plata/223 y la
// mayoría del interior). NO distingue Buenos Aires (área "11", 2 dígitos)
// ni las provincias con área de 4 dígitos: ambos casos dan el mismo largo
// total que uno de 3 dígitos, así que no se pueden diferenciar sin una
// tabla real de códigos de área. Si en el futuro hay nodos en esas zonas,
// reemplazar esto por una tabla de prefijos o una librería (libphonenumber-js).
export function formatearDestinoWhatsAppAR(numero: string): string {
  if (/^549\d{10}$/.test(numero)) {
    const codigoArea = numero.substring(3, 6);
    const abonado = numero.substring(6);
    return `54${codigoArea}15${abonado}`;
  }
  return numero;
}
