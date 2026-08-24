import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "../../lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

export type CrudField<T> = {
  name: keyof T & string;
  label: string;
  required?: boolean;
};

export type CrudColumn<T> = {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
};

type SimpleCrudPageProps<T extends { id: string }> = {
  title: string;
  endpoint: string;
  fields: CrudField<T>[];
  columns: CrudColumn<T>[];
  canWrite: boolean;
};

export function SimpleCrudPage<T extends { id: string }>({
  title,
  endpoint,
  fields,
  columns,
  canWrite,
}: SimpleCrudPageProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await api.get<T[]>(endpoint));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  function openCreate() {
    setEditing(null);
    setForm(Object.fromEntries(fields.map((f) => [f.name, ""])));
    setModalOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    setForm(Object.fromEntries(fields.map((f) => [f.name, String(item[f.name] ?? "")])));
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.patch(`${endpoint}/${editing.id}`, form);
      } else {
        await api.post(endpoint, form);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: T) {
    if (!confirm("Confirmer la suppression ?")) return;
    setError(null);
    try {
      await api.delete(`${endpoint}/${item.id}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de suppression");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {canWrite && <Button onClick={openCreate}>+ Ajouter</Button>}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-2 text-left font-medium text-slate-600">
                  {c.label}
                </th>
              ))}
              {canWrite && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-slate-400">
                  Aucun élément
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-2 text-slate-700">
                      {c.render ? c.render(item) : String((item as Record<string, unknown>)[c.key] ?? "")}
                    </td>
                  ))}
                  {canWrite && (
                    <td className="space-x-2 px-4 py-2 text-right">
                      <button onClick={() => openEdit(item)} className="text-sm text-slate-500 hover:text-slate-900">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(item)} className="text-sm text-red-500 hover:text-red-700">
                        Supprimer
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Modifier — ${title}` : `Nouveau — ${title}`}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => (
            <Input
              key={f.name}
              label={f.label}
              required={f.required}
              value={form[f.name] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
            />
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
