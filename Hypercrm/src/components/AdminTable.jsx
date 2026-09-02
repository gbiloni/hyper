"use client";
import './AdminTable.css';
import { useState, useEffect, useCallback } from 'react';
import NodoModal from './NodoModal';
import { fetchNodos as apiFetchNodos, createNodo, updateNodo, deleteNodo } from '../services/api';

export default function AdminTable() {
  const [nodos, setNodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNodo, setEditingNodo] = useState(null);

  const fetchNodos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetchNodos();
      setNodos(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodos();
  }, [fetchNodos]);

  const handleSave = async (formData) => {
    if (editingNodo) {
      await updateNodo(editingNodo.id, formData);
    } else {
      await createNodo(formData);
    }
    setModalOpen(false);
    setEditingNodo(null);
    fetchNodos();
  };

  const handleDelete = async (nodo) => {
    if (!confirm(`¿Eliminar el nodo "${nodo.nombre}"?`)) return;
    try {
      await deleteNodo(nodo.id);
      fetchNodos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (nodo) => {
    setEditingNodo(nodo);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingNodo(null);
    setModalOpen(true);
  };

  const filtered = nodos.filter(n =>
    n.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (n.endpoint && n.endpoint.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="admin-table-wrapper">
      <div className="table-controls">
        <div className="search-bar">
          <span className="search-icon">⌕</span>
          <input
            type="text"
            placeholder="Buscar nodos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="controls-right">
          <span className="record-count">{filtered.length} registros</span>
          <button className="btn-primary" onClick={handleNew}>
            <span className="btn-icon">+</span>
            Nuevo Nodo
          </button>
        </div>
      </div>

      {error && (
        <div className="table-error">
          <span>⚠</span> {error}
        </div>
      )}

      <div className="table-container">
        <table className="blade-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Logo</th>
              <th>Nombre</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="empty-state-row">
                <td colSpan="5">
                  <div className="empty-state-content">
                    <div className="loading-spinner"></div>
                    <div className="empty-text">Cargando datos...</div>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr className="empty-state-row">
                <td colSpan="5">
                  <div className="empty-state-content">
                    <div className="warning-icon">⚠</div>
                    <div className="empty-text">Sin datos</div>
                    <div className="empty-subtext">
                      {search ? 'Sin coincidencias // Refinar búsqueda' : 'Sistema inactivo // Esperando datos'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(nodo => (
                <tr key={nodo.id} className="data-row">
                  <td className="col-id">{String(nodo.id).padStart(3, '0')}</td>
                  <td className="col-logo">
                    {nodo.logo_url ? (
                      <img src={nodo.logo_url} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-color-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--neon-cyan)', border: '1px solid var(--neon-cyan)' }}>
                        {nodo.nombre.charAt(0)}
                      </div>
                    )}
                  </td>
                  <td className="col-nombre">{nodo.nombre}</td>
                  <td className="col-actions">
                    <button className="action-btn edit-btn" onClick={() => handleEdit(nodo)} title="Editar">✎</button>
                    <button className="action-btn delete-btn" onClick={() => handleDelete(nodo)} title="Eliminar">✕</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <NodoModal
          nodo={editingNodo}
          onClose={() => { setModalOpen(false); setEditingNodo(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
