import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeSettingsModal({ onClose }) {
  const { theme, updateTheme, resetTheme, loading } = useTheme();

  const [localTheme, setLocalTheme] = useState(theme);

  useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);

  function hexToRgb(hex) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length == 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(', ');
    }
    return "0, 240, 255";
  }

  const handleChange = (key, value) => {
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
    if (key === 'bgGradientEnd') root.style.setProperty('--background-end', value);
    if (key === 'surfaceDark') root.style.setProperty('--background-panel', value);
    if (key === 'bgPattern') {
      root.style.setProperty('--bg-pattern', value);
      root.setAttribute('data-bg-pattern', value);
    }

    if (key === 'primary') {
      root.style.setProperty('--primary-rgb', updated.primaryRgb);
      root.style.setProperty('--glow-primary', updated.glowPrimary);
    }
    if (key === 'accent') root.style.setProperty('--accent-rgb', updated.accentRgb);
  };

  const handleSave = async () => {
    await updateTheme(localTheme);
    alert("Tema guardado exitosamente");
    onClose();
  };

  const handleReset = async () => {
    if (confirm("¿Estás seguro de que deseas volver al tema por defecto (Cyberpunk)?")) {
      await resetTheme();
      alert("Tema restaurado a los valores por defecto (Cyberpunk)");
      onClose();
    }
  };

  const PRESETS = [
    {
      id: 'cyberpunk', name: 'Cyberpunk', category: 'Oscuro',
      theme: { primary: '#9500ff', accent: '#00f3ff', cta: '#ff003c', bgGradientStart: '#0a0a0a', bgGradientEnd: '#12081c', bgPattern: 'grid', surfaceDark: '#0f172a', surfaceLight: 'rgba(255, 255, 255, 0.05)', textMain: '#e2e8f0', textMuted: '#94a3b8' }
    },
    {
      id: 'matrix', name: 'Matrix', category: 'Oscuro',
      theme: { primary: '#00ff66', accent: '#00cc44', cta: '#22c55e', bgGradientStart: '#050505', bgGradientEnd: '#0a0a0a', bgPattern: 'lines', surfaceDark: '#111111', surfaceLight: 'rgba(0, 255, 65, 0.1)', textMain: '#00ff41', textMuted: '#008f11' }
    },
    {
      id: 'synthwave', name: 'Synthwave', category: 'Oscuro',
      theme: { primary: '#ff2079', accent: '#00d4ff', cta: '#ffbe0b', bgGradientStart: '#1a0b2e', bgGradientEnd: '#2d0a31', bgPattern: 'grid', surfaceDark: '#221533', surfaceLight: 'rgba(255, 32, 121, 0.1)', textMain: '#f8c8dc', textMuted: '#a08eb5' }
    },
    {
      id: 'corporativo', name: 'Corporativo', category: 'Oscuro',
      theme: { primary: '#1a56db', accent: '#3b82f6', cta: '#2563eb', bgGradientStart: '#0f172a', bgGradientEnd: '#1e293b', bgPattern: 'dots', surfaceDark: '#1e293b', surfaceLight: 'rgba(255, 255, 255, 0.05)', textMain: '#f8fafc', textMuted: '#94a3b8' }
    },
    {
      id: 'elegante', name: 'Elegante', category: 'Oscuro',
      theme: { primary: '#c084fc', accent: '#e879f9', cta: '#a855f7', bgGradientStart: '#1e1b2e', bgGradientEnd: '#2d2a4a', bgPattern: 'dots', surfaceDark: '#2d2a4a', surfaceLight: 'rgba(255, 255, 255, 0.05)', textMain: '#f3e8ff', textMuted: '#d8b4fe' }
    },
    {
      id: 'claro', name: 'Claro', category: 'Claro',
      theme: { primary: '#6366f1', accent: '#818cf8', cta: '#4f46e5', bgGradientStart: '#f8fafc', bgGradientEnd: '#f1f5f9', bgPattern: 'dots', surfaceDark: '#ffffff', surfaceLight: 'rgba(0, 0, 0, 0.05)', textMain: '#0f172a', textMuted: '#475569' }
    },
    {
      id: 'papel', name: 'Papel', category: 'Claro',
      theme: { primary: '#b45309', accent: '#d97706', cta: '#ea580c', bgGradientStart: '#fdf6e3', bgGradientEnd: '#eee8d5', bgPattern: 'none', surfaceDark: '#ffffff', surfaceLight: 'rgba(0, 0, 0, 0.05)', textMain: '#657b83', textMuted: '#93a1a1' }
    },
    {
      id: 'minimal', name: 'Minimal', category: 'Claro',
      theme: { primary: '#334155', accent: '#0ea5e9', cta: '#0284c7', bgGradientStart: '#ffffff', bgGradientEnd: '#f8fafc', bgPattern: 'grid', surfaceDark: '#f1f5f9', surfaceLight: 'rgba(0, 0, 0, 0.05)', textMain: '#0f172a', textMuted: '#64748b' }
    },
    {
      id: 'alto-contraste', name: 'Alto Contraste', category: 'Accesible',
      theme: { primary: '#000000', accent: '#ffdd00', cta: '#0072b2', bgGradientStart: '#ffffff', bgGradientEnd: '#ffffff', bgPattern: 'none', surfaceDark: '#f0f0f0', surfaceLight: 'rgba(0, 0, 0, 0.1)', textMain: '#000000', textMuted: '#333333' }
    },
    {
      id: 'daltonico', name: 'Daltónico Seguro', category: 'Accesible',
      theme: { primary: '#0072b2', accent: '#e69f00', cta: '#d55e00', bgGradientStart: '#12141a', bgGradientEnd: '#1a1c23', bgPattern: 'dots', surfaceDark: '#1e212b', surfaceLight: 'rgba(255, 255, 255, 0.05)', textMain: '#ffffff', textMuted: '#a0aab5' }
    }
  ];

  const handleSelectPreset = (preset) => {
    const updated = { ...localTheme, ...preset.theme, preset: preset.id };

    if (preset.theme.primary) {
      updated.primaryRgb = hexToRgb(preset.theme.primary);
      updated.glowPrimary = `0 0 20px rgba(${updated.primaryRgb}, 0.3)`;
    }
    if (preset.theme.accent) {
      updated.accentRgb = hexToRgb(preset.theme.accent);
    }

    setLocalTheme(updated);

    const root = document.documentElement;
    root.style.setProperty('--neon-magenta', updated.primary || localTheme.primary);
    root.style.setProperty('--neon-cyan', updated.accent || localTheme.accent);
    root.style.setProperty('--accent-red', updated.cta || localTheme.cta);
    root.style.setProperty('--background', updated.bgGradientStart || localTheme.bgGradientStart);
    root.style.setProperty('--background-end', updated.bgGradientEnd || localTheme.bgGradientEnd);
    root.style.setProperty('--background-panel', updated.surfaceDark || localTheme.surfaceDark);
    root.style.setProperty('--foreground', updated.textMain || localTheme.textMain);
    root.style.setProperty('--bg-pattern', updated.bgPattern || localTheme.bgPattern || 'none');
    root.setAttribute('data-bg-pattern', updated.bgPattern || localTheme.bgPattern || 'none');

    root.style.setProperty('--primary', updated.primary || localTheme.primary);
    root.style.setProperty('--accent', updated.accent || localTheme.accent);
    root.style.setProperty('--text-main', updated.textMain || localTheme.textMain);
    root.style.setProperty('--text-muted', updated.textMuted || localTheme.textMuted);

    if (updated.primaryRgb) {
      root.style.setProperty('--primary-rgb', updated.primaryRgb);
      root.style.setProperty('--glow-primary', updated.glowPrimary);
    }
    if (updated.accentRgb) {
      root.style.setProperty('--accent-rgb', updated.accentRgb);
    }
  };

  const colors = [
    { key: "primary", label: "Color Primario", type: "color" },
    { key: "accent", label: "Color de Acento", type: "color" },
    { key: "cta", label: "Fondo Boton", type: "color" },
    { key: "bgGradientStart", label: "Fondo Gradiente 1", type: "color" },
    { key: "bgGradientEnd", label: "Fondo Gradiente 2", type: "color" },
    { key: "surfaceDark", label: "Fondo de Paneles", type: "color" },
    { key: "textMain", label: "Texto Principal", type: "color" },
  ];

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="modal-content" style={{
        background: 'var(--background-panel)', border: '1px solid var(--primary)',
        borderRadius: '8px', padding: '2rem', width: '90%', maxWidth: '900px',
        boxShadow: 'var(--glow-primary)', maxHeight: '90vh', overflowY: 'auto',
        color: 'var(--text-main)', display: 'flex', flexDirection: 'column'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Personalización Visual</h2>

        {loading ? (
          <p>Cargando tema...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

            {/* PRESETS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>Temas Predefinidos</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.8rem' }}>
                {PRESETS.map((p) => {
                  const isActive = localTheme.preset === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPreset(p)}
                      style={{
                        border: isActive ? `2px solid ${p.theme.primary}` : '1px solid var(--text-muted)',
                        borderRadius: '6px', padding: '0.5rem', cursor: 'pointer',
                        background: p.theme.bgGradientStart, color: p.theme.textMain,
                        boxShadow: isActive ? `0 0 10px ${p.theme.primary}40` : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
                        {p.name}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', height: '12px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ flex: 1, background: p.theme.primary }}></div>
                        <div style={{ flex: 1, background: p.theme.accent }}></div>
                        <div style={{ flex: 1, background: p.theme.cta }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CUSTOMIZATION & PREVIEW */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Ajustes Personalizados</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal', alignSelf: 'center' }}>(Modifica los colores)</span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {colors.map((color) => (
                  <div key={color.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'var(--background)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--primary)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{color.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="color"
                        value={localTheme[color.key] || '#000000'}
                        onChange={(e) => {
                          const updated = { ...localTheme, preset: 'custom' };
                          setLocalTheme(updated);
                          handleChange(color.key, e.target.value);
                        }}
                        style={{ cursor: 'pointer', border: 'none', background: 'transparent', width: '24px', height: '24px', padding: 0 }}
                      />
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{localTheme[color.key] || '#000000'}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'var(--background)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--primary)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patrón de Fondo</span>
                <select
                  value={localTheme.bgPattern || 'none'}
                  onChange={(e) => {
                    const updated = { ...localTheme, preset: 'custom' };
                    setLocalTheme(updated);
                    handleChange('bgPattern', e.target.value);
                  }}
                  style={{ background: 'var(--background-panel)', color: 'var(--text-main)', border: '1px solid var(--primary)', padding: '0.4rem', borderRadius: '4px' }}
                >
                  <option value="none">Sin Patrón (Liso/Gradiente)</option>
                  <option value="grid">Grilla (Cuadrícula)</option>
                  <option value="dots">Puntos (Radial)</option>
                  <option value="lines">Líneas Diagonales</option>
                </select>
              </div>

              {/* LIVE PREVIEW BOX */}
              <div style={{
                marginTop: '1rem', padding: '1rem', borderRadius: '6px',
                background: localTheme.surfaceDark, border: `1px solid ${localTheme.primary}40`,
                boxShadow: `0 0 15px ${localTheme.primary}20`
              }}>
                <h4 style={{ color: localTheme.textMain, margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Vista Previa en Vivo</h4>
                <p style={{ color: localTheme.textMuted, fontSize: '0.8rem', marginBottom: '1rem' }}>
                  Así se verán los paneles y botones.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={{ background: localTheme.cta, color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    Acción Principal
                  </button>
                  <button style={{ background: 'transparent', color: localTheme.accent, border: `1px solid ${localTheme.accent}`, padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                    Botón Secundario
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingTop: '1rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', borderRadius: '4px', cursor: 'pointer' }}>
                  Cerrar
                </button>
                <button onClick={handleSave} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', boxShadow: 'var(--glow-primary)' }}>
                  Guardar Tema
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
