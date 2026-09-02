import { cookies } from "next/headers";

export async function getApiConfig() {
  const cookieStore = await cookies();
  const endpoint = cookieStore.get("hyperisp_active_endpoint")?.value;
  const token = cookieStore.get("hyperisp_active_token")?.value;
  
  if (!endpoint) {
    throw new Error("No hay un nodo activo seleccionado. Por favor, vuelva a la pantalla de inicio y seleccione una ciudad.");
  }
  
  if (!token || !token.includes(':')) {
    throw new Error("⚠️ ACCESO DENEGADO: El nodo seleccionado no tiene un token de API válido configurado (formato esperado clave:password). Comuníquese con el administrador.");
  }
  
  return {
    apiUrl: decodeURIComponent(endpoint),
    token: decodeURIComponent(token)
  };
}
