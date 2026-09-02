import axios from "axios";

const JAVA_API_URL = process.env.JAVA_API_URL || 'http://10.99.98.250:8080/api3';

// Instancia base para conectarse al backend Java 8 (Hypermgmt)
const api = axios.create({
  // Aseguramos que apunte a la ruta de la API Java.
  baseURL: JAVA_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Los fallbacks han sido eliminados por política estricta de seguridad.
import { cookies } from "next/headers";

// Interceptor para inyectar el token en cada petición
api.interceptors.request.use(async (config) => {
  try {
    const cookieStore = await cookies();
    const endpoint = cookieStore.get("hyperisp_active_endpoint")?.value;
    const token = cookieStore.get("hyperisp_active_token")?.value;
    
    if (endpoint) {
      config.baseURL = decodeURIComponent(endpoint);
    } else {
      return Promise.reject(new Error("No hay un nodo activo seleccionado."));
    }
    
    if (token && token.includes(':')) {
      config.headers.Authorization = `Bearer ${decodeURIComponent(token)}`;
    } else {
      return Promise.reject(new Error("⚠️ ACCESO DENEGADO: El nodo seleccionado no tiene un token de API válido configurado (formato esperado clave:password)."));
    }
  } catch (error) {
    return Promise.reject(error);
  }
  return config;
});

export default api;
