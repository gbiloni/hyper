"use client";

import React, { useState, useEffect } from "react";
import { useTheme, ThemeConfig } from "@/context/ThemeContext";
import { Save, RefreshCw, Palette } from "lucide-react";

export default function ThemeSettings() {
  const { theme, updateTheme, resetTheme, loading } = useTheme();
  
  const [localTheme, setLocalTheme] = useState<ThemeConfig>(theme);
  
  useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);

  function hexToRgb(hex: string) {
    let c: any;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return [(c>>16)&255, (c>>8)&255, c&255].join(', ');
    }
    return "0, 240, 255"; 
  }

  const handleChange = (key: keyof ThemeConfig, value: string) => {
    const updated = { ...localTheme, [key]: value };
    if (key === 'primary') {
      updated.primaryRgb = hexToRgb(value);
      updated.glowPrimary = `0 0 20px rgba(${updated.primaryRgb}, 0.3)`;
    }
    if (key === 'accent') {
      updated.accentRgb = hexToRgb(value);
    }
    setLocalTheme(updated);
    
    // Live preview
    const root = document.documentElement;
    const cssVar = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    root.style.setProperty(cssVar, value);
    
    // Mapeo a Hyperportal
    if (key === 'primary') root.style.setProperty('--neon-magenta', value);
    if (key === 'accent') root.style.setProperty('--neon-cyan', value);
    if (key === 'cta') root.style.setProperty('--accent-red', value);
    if (key === 'bgGradientStart') root.style.setProperty('--background', value);
    if (key === 'surfaceDark') root.style.setProperty('--background-panel', value);
    
    if (key === 'primary') {
      root.style.setProperty('--primary-rgb', updated.primaryRgb);
      root.style.setProperty('--glow-primary', updated.glowPrimary);
    }
    if (key === 'accent') root.style.setProperty('--accent-rgb', updated.accentRgb);
  };

  const handleSave = async () => {
    await updateTheme(localTheme);
    alert("Tema guardado exitosamente");
  };

  const handleReset = async () => {
    if (confirm("¿Estás seguro de que deseas volver al tema por defecto (Cyberpunk)?")) {
      await resetTheme();
      alert("Tema restaurado a los valores por defecto (Cyberpunk)");
    }
  };

  if (loading) {
    return <div className="text-white p-6 flex items-center justify-center h-full"><RefreshCw className="animate-spin mr-2" /> Cargando configuración de tema...</div>;
  }

  const colors = [
    { key: "primary", label: "Color Primario (Cyan base)", type: "color" },
    { key: "accent", label: "Color de Acento (Rojo base)", type: "color" },
    { key: "cta", label: "Call to Action (Botones)", type: "color" },
    { key: "bgGradientStart", label: "Fondo Gradiente Inicio", type: "color" },
    { key: "bgGradientEnd", label: "Fondo Gradiente Fin", type: "color" },
    { key: "textMain", label: "Texto Principal", type: "color" },
  ];

  return (
    <div className="flex-1 p-6 text-[var(--text-main)] overflow-auto h-full">
      <div className="max-w-4xl mx-auto space-y-8 bg-[var(--surface-dark)] p-8 border border-[var(--primary)]/30 rounded-lg shadow-[var(--glow-primary)]">
        
        <header className="border-b border-[var(--primary)]/30 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Palette className="text-[var(--primary)]" /> 
              Personalización de Tema
            </h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm">
              Ajusta los colores y el diseño del sistema a tu gusto.
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleReset}
              className="px-4 py-2 bg-transparent border border-[var(--accent)]/50 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors flex items-center gap-2 rounded"
            >
              <RefreshCw className="w-4 h-4" />
              Reset 
            </button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-[var(--primary)]/20 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/40 transition-colors flex items-center gap-2 shadow-[var(--glow-primary)] rounded"
            >
              <Save className="w-4 h-4" />
              Guardar Tema
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-[var(--primary)] border-b border-[var(--primary)]/20 pb-2">Colores Base</h2>
            {colors.map((color) => (
              <div key={color.key} className="flex items-center justify-between p-3 bg-black/40 border border-white/10 rounded hover:border-[var(--primary)]/50 transition-colors">
                <span className="text-sm font-medium">{color.label}</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={(localTheme as any)[color.key]} 
                    onChange={(e) => handleChange(color.key as keyof ThemeConfig, e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <span className="font-mono text-xs text-[var(--text-muted)] uppercase w-16">
                    {(localTheme as any)[color.key]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-[var(--primary)] border-b border-[var(--primary)]/20 pb-2">Variables Avanzadas</h2>
            
            <div className="flex flex-col gap-2 p-3 bg-black/40 border border-white/10 rounded hover:border-[var(--primary)]/50 transition-colors">
              <span className="text-sm font-medium">Superficie Oscura (Paneles)</span>
              <input 
                type="text" 
                value={localTheme.surfaceDark} 
                onChange={(e) => handleChange("surfaceDark", e.target.value)}
                className="bg-black/50 border border-white/20 rounded p-2 text-sm font-mono focus:border-[var(--primary)] outline-none"
              />
            </div>
            
            <div className="flex flex-col gap-2 p-3 bg-black/40 border border-white/10 rounded hover:border-[var(--primary)]/50 transition-colors">
              <span className="text-sm font-medium">Superficie Clara (Efectos)</span>
              <input 
                type="text" 
                value={localTheme.surfaceLight} 
                onChange={(e) => handleChange("surfaceLight", e.target.value)}
                className="bg-black/50 border border-white/20 rounded p-2 text-sm font-mono focus:border-[var(--primary)] outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 p-3 bg-black/40 border border-white/10 rounded hover:border-[var(--primary)]/50 transition-colors">
              <span className="text-sm font-medium">Texto Secundario (Muted)</span>
              <input 
                type="text" 
                value={localTheme.textMuted} 
                onChange={(e) => handleChange("textMuted", e.target.value)}
                className="bg-black/50 border border-white/20 rounded p-2 text-sm font-mono focus:border-[var(--primary)] outline-none"
              />
            </div>

            {/* Preview Card */}
            <div className="mt-8 p-6 bg-[var(--surface-dark)] border border-[var(--primary)]/40 rounded-lg shadow-[var(--glow-primary)] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"></div>
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Previsualización en Vivo</h3>
              <p className="text-[var(--text-muted)] text-sm mb-4">Así se verán los componentes con los colores seleccionados.</p>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-[var(--cta)] text-black font-bold rounded shadow-[var(--glow-primary)]">CTA Principal</button>
                <button className="px-4 py-2 bg-transparent border border-[var(--accent)] text-[var(--accent)] rounded hover:bg-[var(--accent)]/10">Acento Secundario</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
