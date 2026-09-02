"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Plus, Trash2, CheckCircle2, Clock, AlertTriangle, X } from "lucide-react";

interface WhatsappTemplate {
  id: number;
  name: string;
  language: string;
  category: "MARKETING" | "TRANSACTIONAL" | "UTILITY";
  body_text: string;
  meta_status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  created_at: string;
}

const emptyForm = {
  name: "",
  language: "es",
  category: "TRANSACTIONAL" as WhatsappTemplate["category"],
  header_text: "",
  body_text: "",
  footer_text: "",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-templates");
      const data = await res.json();
      if (data.success) setTemplates(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.name.trim() || !formData.body_text.trim()) {
      setError("El nombre y el contenido son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/hypercrm/api/whatsapp-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg("Plantilla creada correctamente.");
        setFormData(emptyForm);
        setShowForm(false);
        await loadTemplates();
      } else {
        setError(data.error || "Error guardando la plantilla.");
      }
    } catch (e) {
      setError("Error de red al guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    try {
      await fetch(`/hypercrm/api/whatsapp-templates/${id}`, { method: "DELETE" });
      await loadTemplates();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] tracking-wide flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--primary)]" />
            Plantillas de WhatsApp
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Gestioná las plantillas de mensajes para notificaciones, marketing y utilidades. Requieren aprobación de Meta.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); setSuccessMsg(null); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)] text-[var(--primary)] font-semibold text-sm hover:bg-[var(--primary)]/30 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancelar" : "Nueva Plantilla"}
        </button>
      </div>

      {showForm && (
        <div className="bg-background-panel border border-[var(--primary)]/20 rounded-2xl p-5 space-y-4">
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre (ej: order_confirmation)"
                className="bg-background border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                required
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as WhatsappTemplate["category"] })}
                className="bg-background border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="TRANSACTIONAL">Transaccional</option>
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utility</option>
              </select>
              <input
                type="text"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                placeholder="Idioma (es, en)"
                className="bg-background border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            <input
              type="text"
              value={formData.header_text}
              onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
              placeholder="Encabezado (opcional)"
              className="w-full bg-background border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            />
            <textarea
              value={formData.body_text}
              onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
              placeholder="Contenido del mensaje. Usá {{1}}, {{2}}, etc. para variables."
              className="w-full bg-background border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] min-h-24"
              required
            />
            <input
              type="text"
              value={formData.footer_text}
              onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
              placeholder="Pie de página (opcional)"
              className="w-full bg-background border border-[var(--primary)]/30 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)] text-[var(--primary)] font-semibold text-sm hover:bg-[var(--primary)]/30 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar Plantilla"}
            </button>
          </form>

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </p>
          )}
          {successMsg && (
            <p className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {successMsg}
            </p>
          )}
        </div>
      )}

      <div className="bg-background-panel border border-[var(--primary)]/20 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--primary)]/20 text-[var(--text-muted)] text-xs uppercase tracking-wider">
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Categoría</th>
              <th className="text-left p-3">Contenido</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-right p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="text-center p-6 text-[var(--text-muted)] text-sm">
                  Todavía no hay plantillas creadas.
                </td>
              </tr>
            )}
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-[var(--primary)]/10 hover:bg-white/[0.02]">
                <td className="p-3 text-[var(--text-main)] font-mono text-xs">{t.name}</td>
                <td className="p-3 text-[var(--text-muted)] text-xs">{t.category}</td>
                <td className="p-3 text-[var(--text-muted)] text-xs max-w-xs truncate">{t.body_text}</td>
                <td className="p-3">
                  {t.meta_status === "APPROVED" && (
                    <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado
                    </span>
                  )}
                  {t.meta_status === "PENDING_APPROVAL" && (
                    <span className="inline-flex items-center gap-1 text-yellow-400 text-xs">
                      <Clock className="w-3.5 h-3.5" /> Pendiente
                    </span>
                  )}
                  {t.meta_status === "REJECTED" && (
                    <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5" /> Rechazado
                    </span>
                  )}
                  {t.meta_status === "DRAFT" && (
                    <span className="inline-flex items-center gap-1 text-[var(--text-muted)] text-xs">
                      <FileText className="w-3.5 h-3.5" /> Borrador
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
