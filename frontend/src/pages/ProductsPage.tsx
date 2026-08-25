import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Product, Category, Unit } from "../lib/types";
import { buildCategoryTree } from "../lib/categoryTree";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";

type FormState = {
  name: string;
  sku: string;
  categoryId: string;
  unitId: string;
  purchasePrice: string;
  sellingPrice: string;
  alertThreshold: string;
};

const emptyForm: FormState = {
  name: "",
  sku: "",
  categoryId: "",
  unitId: "",
  purchasePrice: "",
  sellingPrice: "",
  alertThreshold: "0",
};

export function ProductsPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "MODERATOR";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustForm, setAdjustForm] = useState({ quantity: "", note: "" });
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [sellUnitsTargetId, setSellUnitsTargetId] = useState<string | null>(null);
  const [newSellUnit, setNewSellUnit] = useState({ unitId: "", conversionFactor: "", sellingPrice: "" });
  const [sellUnitSaving, setSellUnitSaving] = useState(false);

  async function load() {
    try {
      const [p, c, u] = await Promise.all([
        api.get<Product[]>("/products"),
        api.get<Category[]>("/categories"),
        api.get<Unit[]>("/units"),
      ]);
      setProducts(p);
      setCategories(c);
      setUnits(u);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      categoryId: product.categoryId,
      unitId: product.unitId,
      purchasePrice: String(product.purchasePrice),
      sellingPrice: String(product.sellingPrice),
      alertThreshold: String(product.alertThreshold),
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      sku: form.sku || null,
      categoryId: form.categoryId,
      unitId: form.unitId,
      purchasePrice: Number(form.purchasePrice),
      sellingPrice: Number(form.sellingPrice),
      alertThreshold: Number(form.alertThreshold),
    };
    try {
      if (editing) {
        await api.patch(`/products/${editing.id}`, { ...payload, isActive: editing.isActive });
      } else {
        await api.post("/products", payload);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(product: Product) {
    if (!confirm(`Désactiver "${product.name}" ?`)) return;
    setError(null);
    try {
      await api.delete(`/products/${product.id}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur");
    }
  }

  function openAdjust(product: Product) {
    setAdjustTarget(product);
    setAdjustForm({ quantity: "", note: "" });
    setError(null);
  }

  async function handleAdjustSubmit(e: FormEvent) {
    e.preventDefault();
    if (!adjustTarget) return;
    setAdjustSaving(true);
    setError(null);
    try {
      await api.post(`/products/${adjustTarget.id}/adjustments`, {
        quantity: Number(adjustForm.quantity),
        note: adjustForm.note || null,
      });
      setAdjustTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'ajustement");
    } finally {
      setAdjustSaving(false);
    }
  }

  function openSellUnits(product: Product) {
    setSellUnitsTargetId(product.id);
    setNewSellUnit({ unitId: "", conversionFactor: "", sellingPrice: "" });
    setError(null);
  }

  async function handleAddSellUnit(e: FormEvent) {
    e.preventDefault();
    if (!sellUnitsTargetId) return;
    setSellUnitSaving(true);
    setError(null);
    try {
      await api.post(`/products/${sellUnitsTargetId}/sell-units`, {
        unitId: newSellUnit.unitId,
        conversionFactor: Number(newSellUnit.conversionFactor),
        sellingPrice: Number(newSellUnit.sellingPrice),
      });
      setNewSellUnit({ unitId: "", conversionFactor: "", sellingPrice: "" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setSellUnitSaving(false);
    }
  }

  async function handleDeleteSellUnit(sellUnitId: string) {
    if (!sellUnitsTargetId || !confirm("Supprimer cette unité de vente ?")) return;
    setError(null);
    try {
      await api.delete(`/products/${sellUnitsTargetId}/sell-units/${sellUnitId}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de suppression");
    }
  }

  if (loading) return <p className="text-slate-400">Chargement…</p>;

  const sellUnitsTarget = products.find((p) => p.id === sellUnitsTargetId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Produits</h1>
        {canWrite && <Button onClick={openCreate}>+ Ajouter</Button>}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Nom</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Catégorie</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Unité</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Prix achat</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Prix vente</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Stock</th>
              {canWrite && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.id} className={!p.isActive ? "opacity-40" : ""}>
                <td className="px-4 py-2 text-slate-700">
                  {p.name}
                  {p.sku ? <span className="ml-1 text-xs text-slate-400">({p.sku})</span> : null}
                </td>
                <td className="px-4 py-2 text-slate-700">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-600">
                    {p.category.code}
                  </span>{" "}
                  {p.category.name}
                </td>
                <td className="px-4 py-2 text-slate-700">{p.unit.name}</td>
                <td className="px-4 py-2 text-right text-slate-700">{Number(p.purchasePrice).toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-slate-700">{Number(p.sellingPrice).toFixed(2)}</td>
                <td
                  className={`px-4 py-2 text-right font-medium ${
                    p.stockQuantity <= p.alertThreshold ? "text-red-600" : "text-slate-700"
                  }`}
                >
                  {p.stockQuantity}
                </td>
                {canWrite && (
                  <td className="space-x-2 px-4 py-2 text-right">
                    <button onClick={() => openSellUnits(p)} className="text-sm text-slate-500 hover:text-slate-900">
                      Unités de vente
                    </button>
                    <button onClick={() => openAdjust(p)} className="text-sm text-slate-500 hover:text-slate-900">
                      Ajuster stock
                    </button>
                    <button onClick={() => openEdit(p)} className="text-sm text-slate-500 hover:text-slate-900">
                      Modifier
                    </button>
                    {p.isActive && (
                      <button
                        onClick={() => handleDeactivate(p)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Désactiver
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Modifier le produit" : "Nouveau produit"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nom" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Référence (SKU)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <Select
            label="Catégorie"
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Sélectionner…</option>
            {buildCategoryTree(categories).map((c) => (
              <option key={c.id} value={c.id}>
                {"— ".repeat(c.depth)}
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Unité"
            required
            value={form.unitId}
            onChange={(e) => setForm({ ...form, unitId: e.target.value })}
          >
            <option value="">Sélectionner…</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prix d'achat"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.purchasePrice}
              onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
            />
            <Input
              label="Prix de vente"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.sellingPrice}
              onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
            />
          </div>
          <Input
            label="Seuil d'alerte stock"
            type="number"
            min="0"
            value={form.alertThreshold}
            onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })}
          />
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

      <Modal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title={adjustTarget ? `Ajuster le stock — ${adjustTarget.name}` : "Ajuster le stock"}
      >
        {adjustTarget && (
          <form onSubmit={handleAdjustSubmit} className="space-y-3">
            <p className="text-sm text-slate-500">Stock actuel : {adjustTarget.stockQuantity}</p>
            <Input
              label="Quantité (positive pour ajouter, négative pour retirer)"
              type="number"
              step="1"
              required
              value={adjustForm.quantity}
              onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
            />
            <Input
              label="Motif (optionnel)"
              placeholder="Ex : stock initial, inventaire, produit périmé…"
              value={adjustForm.note}
              onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setAdjustTarget(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={adjustSaving}>
                {adjustSaving ? "Enregistrement…" : "Appliquer"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!sellUnitsTarget}
        onClose={() => setSellUnitsTargetId(null)}
        title={sellUnitsTarget ? `Unités de vente — ${sellUnitsTarget.name}` : "Unités de vente"}
      >
        {sellUnitsTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Unité de stock : <span className="font-medium">{sellUnitsTarget.unit.name}</span> — prix de base{" "}
              {Number(sellUnitsTarget.sellingPrice).toFixed(2)} Ar / {sellUnitsTarget.unit.symbol ?? sellUnitsTarget.unit.name}
            </p>

            {sellUnitsTarget.sellUnits.length > 0 && (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {sellUnitsTarget.sellUnits.map((su) => (
                  <li key={su.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-slate-700">
                      {su.unit.name} = {su.conversionFactor} {sellUnitsTarget.unit.symbol ?? sellUnitsTarget.unit.name} —{" "}
                      {Number(su.sellingPrice).toFixed(2)} Ar
                    </span>
                    <button onClick={() => handleDeleteSellUnit(su.id)} className="text-sm text-red-500 hover:text-red-700">
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddSellUnit} className="space-y-3 border-t border-slate-200 pt-4">
              <p className="text-sm font-medium text-slate-700">Ajouter une unité de vente</p>
              <Select
                label="Unité"
                required
                value={newSellUnit.unitId}
                onChange={(e) => setNewSellUnit({ ...newSellUnit, unitId: e.target.value })}
              >
                <option value="">Sélectionner…</option>
                {units
                  .filter((u) => u.id !== sellUnitsTarget.unitId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </Select>
              <Input
                label={`Équivaut à combien de ${sellUnitsTarget.unit.symbol ?? sellUnitsTarget.unit.name} ?`}
                type="number"
                min="1"
                required
                value={newSellUnit.conversionFactor}
                onChange={(e) => setNewSellUnit({ ...newSellUnit, conversionFactor: e.target.value })}
              />
              <Input
                label="Prix de vente pour cette unité"
                type="number"
                step="0.01"
                min="0"
                required
                value={newSellUnit.sellingPrice}
                onChange={(e) => setNewSellUnit({ ...newSellUnit, sellingPrice: e.target.value })}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setSellUnitsTargetId(null)}>
                  Fermer
                </Button>
                <Button type="submit" disabled={sellUnitSaving}>
                  {sellUnitSaving ? "Enregistrement…" : "Ajouter"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
