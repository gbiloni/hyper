import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = [
  "/",           // Landing page
  "/login",      // Login page
  "/plataforma", // Landing pública (la revisa Meta para la verificación de proveedor de tecnología)
  "/privacidad", // Política de privacidad (URL declarada en la app de Meta)
  "/terminos",   // Términos del servicio (URL declarada en la app de Meta)
  "/eliminar-datos", // Instrucciones de eliminación de datos (URL declarada en la app de Meta)
  "/admin",      // Panel Admin de Hyperportal (auth via JWT)
  "/api/auth",   // API de autenticación
  "/api/system", // API de branding (pública)
  "/api/nodos",  // Hyperportal API
  "/api/usuarios", // Hyperportal API
  "/api/check-node", // API de verificación de nodos
  "/api/webhook/telegram", // Webhook de Telegram (llamado por Telegram, sin cookie de sesión)
  "/hypercrm/api/whatsapp-webhooks/messages", // Webhook de WhatsApp multi-tenant (llamado por Meta, sin cookie de sesión)
  "/hypercrm/api/system", // API de branding de HyperCRM
  "/hypercrm/api/auth", // API de auth de HyperCRM
  "/hypercrm/api/usuarios", // API de usuarios de HyperCRM
  "/hypercrm/api/roles" // API de roles de HyperCRM
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Siempre permitir assets estáticos
  const isPublicAsset = pathname.includes(".");
  // Verificar si es una ruta pública
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isPublicAsset || isPublicPath) {
    return NextResponse.next();
  }

  // Rutas protegidas: requieren cookie de sesión
  const authCookie = request.cookies.get("hyperisp_session");
  if (!authCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
