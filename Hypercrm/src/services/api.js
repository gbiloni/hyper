const API_BASE = '/api';

function getHeaders(includeAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = localStorage.getItem('hyperisp_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error("No es JSON. Status:", res.status, "URL:", res.url);
    console.error("HTML recibido:", text.substring(0, 150));
    throw new Error('La API devolvió un error inesperado (no es JSON).');
  }
  
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

// Auth
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password })
  });
  return handleResponse(res);
}

export async function changePassword(username, currentPassword, newPassword) {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ username, current_password: currentPassword, new_password: newPassword })
  });
  return handleResponse(res);
}

export async function verifyToken() {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders(true) });
  return handleResponse(res);
}

// Nodos
export async function fetchNodosPublicos() {
  const res = await fetch(`${API_BASE}/nodos/publicos`);
  return handleResponse(res);
}

export async function fetchNodos() {
  const res = await fetch(`${API_BASE}/nodos`, { headers: getHeaders(true) });
  return handleResponse(res);
}

export async function createNodo(data) {
  const res = await fetch(`${API_BASE}/nodos`, {
    method: 'POST', headers: getHeaders(true), body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateNodo(id, data) {
  const res = await fetch(`${API_BASE}/nodos/${id}`, {
    method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteNodo(id) {
  const res = await fetch(`${API_BASE}/nodos/${id}`, {
    method: 'DELETE', headers: getHeaders(true)
  });
  return handleResponse(res);
}

// Usuarios
export async function fetchUsuarios() {
  const res = await fetch(`${API_BASE}/usuarios`, { headers: getHeaders(true) });
  return handleResponse(res);
}

export async function createUsuario(data) {
  const res = await fetch(`${API_BASE}/usuarios`, {
    method: 'POST', headers: getHeaders(true), body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateUsuario(id, data) {
  const res = await fetch(`${API_BASE}/usuarios/${id}`, {
    method: 'PUT', headers: getHeaders(true), body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteUsuario(id) {
  const res = await fetch(`${API_BASE}/usuarios/${id}`, {
    method: 'DELETE', headers: getHeaders(true)
  });
  return handleResponse(res);
}
