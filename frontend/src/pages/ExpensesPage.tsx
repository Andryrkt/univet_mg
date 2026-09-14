import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { Expense, ExpenseCategory, Location, Paginated } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { AmountInput } from "../components/ui/AmountInput";
import { Select } from "../components/ui/Select";
import { SearchInput } from "../components/ui/SearchInput";
import { HelpTooltip } from "../components/ui/HelpTooltip";
import { Pagination } from "../components/ui/Pagination";
import { formatAmount } from "../lib/format";

const PAGE_SIZE = 25;

const emptyForm = { categoryId: "", locationId: "", amount: "", method: "CASH" as "CASH" | "OTHER", note: "" };

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  async function loadExpenses() {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    const data = await api.get<Paginated<Expense>>(`/expenses?${params.toString()}`);
    setExpenses(data.items);
    setTotal(data.total);
    setTotalPages(data.totalPages);
  }

  async function load() {
    try {
      const [c, l] = await Promise.all([
        api.get<ExpenseCategory[]>("/expense-categories"),
        api.get<Location[]>("/locations"),
      ]);
      setCategories(c);
      const activeLocations = l.filter((loc) => loc.isActive);
      setLocations(activeLocations);
      setForm((prev) => ({ ...prev, locationId: prev.locationId || activeLocations[0]?.id || "" }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadExpenses().catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  async function handleCreateCategory(rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setForm((f) => ({ ...f, categoryId: existing.id }));
      return;
    }
    try {
      const created = await api.post<ExpenseCategory>("/expense-categories", { name });
      setCategories((prev) => [...prev, created]);
      setForm((f) => ({ ...f, categoryId: created.id }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création de la catégorie");
      throw e;
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/expenses", {
        categoryId: form.categoryId,
        locationId: form.locationId,
        amount: Number(form.amount),
        method: form.method,
        note: form.note || null,
      });
      setForm((prev) => ({ ...emptyForm, locationId: prev.locationId }));
      setPage(1);
      await loadExpenses();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Dépenses</h1>
        <HelpTooltip text="Enregistrez chaque sortie d'argent du cabinet. Une dépense en espèces est automatiquement déduite du montant théorique de la caisse à sa prochaine clôture ; une dépense par un autre moyen (virement, Mvola…) est seulement enregistrée pour le suivi comptable." />
      </div>

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:grid-cols-2">
        <Select
          label={
            <span className="inline-flex items-center gap-1.5">
              Catégorie
              <HelpTooltip text="Tapez le nom d'une catégorie existante pour la sélectionner. Si elle n'existe pas encore, tapez son nom puis cliquez sur « + Créer » pour l'ajouter directement, sans quitter ce formulaire." />
            </span>
          }
          required
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          onCreate={handleCreateCategory}
          createLabel={(q) => `+ Créer la catégorie « ${q} »`}
        >
          <option value="">Sélectionner…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          label="Emplacement"
          required
          value={form.locationId}
          onChange={(e) => setForm({ ...form, locationId: e.target.value })}
        >
          <option value="">Sélectionner…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <AmountInput label="Montant" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            Mode de paiement
            <HelpTooltip text="« Espèces » impacte le calcul de la caisse à sa prochaine clôture. « Autre » (virement, Mvola…) est seulement enregistré pour le suivi comptable, sans effet sur la caisse." />
          </label>
          <div className="flex gap-4 pt-1.5 text-sm text-slate-700 dark:text-slate-300">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="expenseMethod"
                checked={form.method === "CASH"}
                onChange={() => setForm({ ...form, method: "CASH" })}
              />
              Espèces
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="expenseMethod"
                checked={form.method === "OTHER"}
                onChange={() => setForm({ ...form, method: "OTHER" })}
              />
              Autre (virement, Mvola…)
            </label>
          </div>
        </div>
        <Input
          label="Note (optionnel)"
          className="sm:col-span-2"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer la dépense"}
          </Button>
        </div>
      </form>

      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par catégorie, emplacement, note…" className="max-w-sm" />

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Catégorie</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Emplacement</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Mode</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Note</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Montant</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Par</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  {search ? "Aucun résultat" : "Aucune dépense. Utilisez le formulaire ci-dessus pour en enregistrer une."}
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{new Date(e.date).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{e.category.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{e.location.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{e.method === "CASH" ? "Espèces" : "Autre"}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{e.note ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100">{formatAmount(e.amount)} Ar</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{e.createdBy.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
    </div>
  );
}
