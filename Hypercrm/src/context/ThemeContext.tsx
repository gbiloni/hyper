"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

const defaultTheme = {
  name: "Blade Runner 2049",
  colors: {
    primary: "#00E5FF", // Icy cyan (rain/neon)
    accent: "#FF8C00", // Dusty amber (Vegas)
    background: "#050505", // Deep charcoal/black
    backgroundPanel: "#0F1115",
    textMain: "#EAECEE",
    textMuted: "#7A8490"
  }
};

const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState(defaultTheme);
  const [loading, setLoading] = useState(true);

  const applyTheme = (t: any) => {
    if (!t || !t.colors) return;
    const root = document.documentElement;
    root.style.setProperty('--primary', t.colors.primary);
    root.style.setProperty('--accent', t.colors.accent);
    root.style.setProperty('--background', t.colors.background);
    root.style.setProperty('--background-panel', t.colors.backgroundPanel);
    root.style.setProperty('--text-main', t.colors.textMain);
    root.style.setProperty('--text-muted', t.colors.textMuted);
    
    // Add RGB variants for opacity usage
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
    };
    
    if (t.colors.primary) root.style.setProperty('--primary-rgb', hexToRgb(t.colors.primary) || '14, 165, 233');
    if (t.colors.accent) root.style.setProperty('--accent-rgb', hexToRgb(t.colors.accent) || '244, 63, 94');
  };

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const res = await fetch("/hypercrm/api/user/theme");
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.tema) {
            setThemeState(data.tema);
            applyTheme(data.tema);
          } else {
            applyTheme(defaultTheme);
          }
        } else {
          applyTheme(defaultTheme);
        }
      } catch (e) {
        console.error("Error loading theme:", e);
        applyTheme(defaultTheme);
      } finally {
        setLoading(false);
      }
    };
    fetchTheme();
  }, []);

  const updateTheme = async (newTheme: any) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      await fetch("/hypercrm/api/user/theme", {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTheme)
      });
    } catch (e) {
      console.error("Error saving theme:", e);
    }
  };

  const resetTheme = () => updateTheme(defaultTheme);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
