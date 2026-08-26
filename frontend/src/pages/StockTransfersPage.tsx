import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { Location, Paginated, Product, StockTransfer } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { SearchInput } from "../components/ui/SearchInput";
import { Pagination } from "../components/ui/Pagination";

const emptyForm = { productId: "", fromLocationId: "", toLocationId: "", quantity: "", note: "" };
const PAGE_SIZE = 25;

export function StockTransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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

  async function loadTransfers() {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    const data = await api.get<Paginated<StockTransfer>>(`/stock-transfers?${params.toString()}`);
    setTransfers(data.items);
    setTotal(data.total);
    setTotalPages(data.totalPages);
  }

  async function load() {
    try {
      const [p, l] = await Promise.all([api.get<Product[]>("/products"), api.get<Location[]>("/locations")]);
      setProducts(p.filter((pr) => pr.isActive));
      setLocations(l.filter((loc) => loc.isActive));
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
    loadTransfers().catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  const selectedProduct = products.find((p) => p.id === form.productId);
  const availableAtSource = selectedProduct?.stocks.find((s) => s.locationId === form.fromLocationId)?.quantity ?? 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/stock-transfers", {
        productId: form.productId,
        fromLocationId: form.fromLocationId,
        toLocationId: form.toLocationId,
        quantity: Number(form.quantity),
        note: form.note || null,
      });
      setForm(emptyForm);
      await Promise.all([load(), loadTransfers()]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du transfert");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Transferts de stock</h1>

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:grid-cols-2">
        <Select
          label="Produit"
          required
          value={form.productId}
          onChange={(e) => setForm({ ...form, productId: e.target.value })}
        >
          <option value="">Sélectionner…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Input
          label={`Quantité${form.fromLocationId ? ` (disponible : ${availableAtSource})` : ""}`}
          type="number"
          min="1"
          required
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
        <Select
          label="Depuis"
          required
          value={form.fromLocationId}
          onChange={(e) => setForm({ ...form, fromLocationId: e.target.value })}
        >
          <option value="">Sélectionner…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <Select
          label="Vers"
          required
          value={form.toLocationId}
          onChange={(e) => setForm({ ...form, toLocationId: e.target.value })}
        >
          <option value="">Sélectionner…</option>
          {locations
            .filter((l) => l.id !== form.fromLocationId)
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
        </Select>
        <Input
          label="Motif (optionnel)"
          className="sm:col-span-2"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Transfert…" : "Transférer"}
          </Button>
        </div>
      </form>

      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par produit, emplacement…" className="max-w-sm" />

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Produit</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">De</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Vers</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Quantité</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Par</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  {search ? "Aucun résultat" : "Aucun transfert"}
                </td>
              </tr>
            ) : (
              transfers.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{t.product.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{t.fromLocation.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{t.toLocation.name}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100">{t.quantity}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{t.createdBy.name}</td>
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
