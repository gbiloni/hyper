"use client";
import './NodoModal.css';
import { useState, useEffect } from 'react';

export default function NodoModal({ nodo, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: '',
    endpoint: '',
    token: '',
    logo_url: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (nodo) {
      setForm({
        nombre:     nodo.nombre     || '',
        endpoint:   nodo.endpoint   || '',
        token:      nodo.token      || '',
        logo_url:   nodo.logo_url   || ''
      });
    }
  }, [nodo]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecciona un archivo de imagen válido.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, logo_url: reader.result }));
      setError('');
    };
    reader.onerror = () => setError('Error al leer el archivo de imagen.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.endpoint.trim()) {
      setError('Nombre y Endpoint son campos obligatorios');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || 'Error al guardar');
      setSaving(false);
    }
  };

  const isEditing = !!nodo;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Editar Nodo' : 'Nuevo Nodo'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <label>Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre del cliente / nodo" autoFocus />
          </div>

          <div className="form-row">
            <label>API Endpoint (HyperISP) *</label>
            <input name="endpoint" value={form.endpoint} onChange={handleChange} placeholder="http://10.x.x.x:8080/api3" />
          </div>

          <div className="form-row">
            <label>API Token (ws_config)</label>
            <input name="token" value={form.token} onChange={handleChange} placeholder="Token de acceso..." />
          </div>

          <div className="form-row">
            <label>Logotipo del Nodo (Imagen)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ color: 'var(--text-light)', fontFamily: 'var(--font-family-base)' }}
            />
            {form.logo_url && (
              <div style={{ marginTop: '10px' }}>
                <img src={form.logo_url} alt="Logo Previsto" style={{ maxHeight: '80px', borderRadius: '4px', objectFit: 'contain' }} />
                <button
                  type="button"
                  onClick={() => setForm(prev => ({...prev, logo_url: ''}))}
                  style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--neon-pink)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Quitar imagen
                </button>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
