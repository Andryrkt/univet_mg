import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import type { Category } from "../lib/types";
import { buildCategoryTree, collectCategoryDescendantIds } from "../lib/categoryTree";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { PlusIcon } from "../components/ui/icons";
import { SearchInput } from "../components/ui/SearchInput";

const emptyForm = { name: "", code: "", description: "", parentId: "" };

export function CategoriesPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "MODERATOR";

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    try {
      setCategories(await api.get<Category[]>("/categories"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate(parentId?: string) {
    setEditing(null);
    setForm({ ...emptyForm, parentId: parentId ?? "" });
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({
      name: category.name,
      code: category.code,
      description: category.description ?? "",
      parentId: category.parentId ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      code: form.code.toUpperCase(),
      description: form.description || null,
      parentId: form.parentId || null,
    };
    try {
      if (editing) {
        await api.patch(`/categories/${editing.id}`, payload);
      } else {
        await api.post("/categories", payload);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    if (!confirm(`Supprimer "${category.name}" ? Ses sous-catégories deviendront des catégories racines.`)) return;
    setError(null);
    try {
      await api.delete(`/categories/${category.id}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de suppression");
    }
  }

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  const tree = buildCategoryTree(categories);
  const excludedIds = editing ? new Set([editing.id, ...collectCategoryDescendantIds(categories, editing.id)]) : new Set<string>();
  const parentOptions = tree.filter((c) => !excludedIds.has(c.id));

  // Filtre par nom/code, en gardant visible la chaîne des parents jusqu'à la racine.
  let visibleTree = tree;
  if (search) {
    const q = search.toLowerCase();
    const byId = new Map(categories.map((c) => [c.id, c]));
    const visibleIds = new Set<string>();
    for (const c of categories) {
      if (c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) {
        let current: typeof c | undefined = c;
        while (current) {
          visibleIds.add(current.id);
          current = current.parentId ? byId.get(current.parentId) : undefined;
        }
      }
    }
    visibleTree = tree.filter((c) => visibleIds.has(c.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Catégories</h1>
        {canWrite && (
          <Button onClick={() => openCreate()}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            Ajouter
          </Button>
        )}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom ou code…" className="max-w-sm" />

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Nom</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Code</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Description</th>
              {canWrite && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleTree.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 4 : 3} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  {search ? "Aucun résultat" : "Aucune catégorie"}
                </td>
              </tr>
            ) : (
              visibleTree.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 pr-4 text-slate-700 dark:text-slate-300" style={{ paddingLeft: `${1 + c.depth * 1.5}rem` }}>
                    {c.depth > 0 && <span className="text-slate-300 dark:text-slate-600">└ </span>}
                    {c.name}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
                      {c.code}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{c.description ?? ""}</td>
                  {canWrite && (
                    <td className="space-x-2 whitespace-nowrap px-4 py-2 text-right">
                      <button onClick={() => openCreate(c.id)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                        + Sous-catégorie
                      </button>
                      <button onClick={() => openEdit(c)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(c)} className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
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
        title={editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nom" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="Code (3 lettres)"
            required
            maxLength={3}
            pattern="[A-Za-z]{3}"
            title="Exactement 3 lettres"
            className="uppercase"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            label="Catégorie parente"
            value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
          >
            <option value="">Aucune (catégorie racine)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(c.depth)}
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
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
