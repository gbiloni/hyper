"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al montar, leer la sesión desde la cookie (via API server-side)
  useEffect(() => {
    fetch('/hypercrm/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.isLoggedIn && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas');
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await fetch('/hypercrm/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    setUser(null);
  };

  const hasRole = (roleId) => {
    if (!user) return false;

    // Admin tiene todos los roles
    const isAd = user.es_admin ||
                 (user.rol && String(user.rol).toUpperCase() === 'ADMIN') ||
                 (user.rol && String(user.rol).toUpperCase() === 'ADMINISTRADOR');
    if (isAd) return true;

    // Técnico por defecto tiene rol 3
    if (user.tecnico && String(roleId) === '3') return true;

    if (!user.roles || !Array.isArray(user.roles)) return false;

    return user.roles.some(r => {
      if (typeof r === 'object' && r !== null) {
        return String(r.id) === String(roleId) || String(r.id_rol) === String(roleId);
      }
      return String(r) === String(roleId);
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
