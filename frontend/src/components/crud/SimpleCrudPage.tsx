import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "../../lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { PlusIcon } from "../ui/icons";
import { SearchInput } from "../ui/SearchInput";

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
  const [search, setSearch] = useState("");

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

  const filteredItems = search
    ? items.filter((item) =>
        columns.some((c) =>
          String((item as Record<string, unknown>)[c.key] ?? "")
            .toLowerCase()
            .includes(search.toLowerCase())
        )
      )
    : items;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            Ajouter
          </Button>
        )}
      </div>

      <SearchInput value={search} onChange={setSearch} className="max-w-sm" />

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                  {c.label}
                </th>
              ))}
              {canWrite && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  Chargement…
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  {search ? "Aucun résultat" : "Aucun élément"}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-2 text-slate-700 dark:text-slate-300">
                      {c.render ? c.render(item) : String((item as Record<string, unknown>)[c.key] ?? "")}
                    </td>
                  ))}
                  {canWrite && (
                    <td className="space-x-2 px-4 py-2 text-right">
                      <button onClick={() => openEdit(item)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(item)} className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
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
