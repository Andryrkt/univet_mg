import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Product, Category, Unit, Location } from "../lib/types";
import { buildCategoryTree } from "../lib/categoryTree";
import { generateCategoryCode } from "../lib/categoryCode";
import { formatAmount } from "../lib/format";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { AmountInput } from "../components/ui/AmountInput";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { HelpTooltip } from "../components/ui/HelpTooltip";
import { PlusIcon } from "../components/ui/icons";
import { SearchInput } from "../components/ui/SearchInput";

function totalStock(product: Product): number {
  return product.stocks.reduce((sum, s) => sum + s.quantity, 0);
}

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
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustForm, setAdjustForm] = useState({ locationId: "", quantity: "", note: "", expiryDate: "" });
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustIsFirstStock, setAdjustIsFirstStock] = useState(false);

  const [sellUnitsTargetId, setSellUnitsTargetId] = useState<string | null>(null);
  const [newSellUnit, setNewSellUnit] = useState({ unitId: "", conversionFactor: "", sellingPrice: "" });
  const [sellUnitSaving, setSellUnitSaving] = useState(false);

  async function load() {
    try {
      const [p, c, u, l] = await Promise.all([
        api.get<Product[]>("/products"),
        api.get<Category[]>("/categories"),
        api.get<Unit[]>("/units"),
        api.get<Location[]>("/locations"),
      ]);
      setProducts(p);
      setCategories(c);
      setUnits(u);
      setLocations(l.filter((loc) => loc.isActive));
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
        setModalOpen(false);
        await load();
      } else {
        const created = await api.post<Product>("/products", payload);
        setModalOpen(false);
        await load();
        setAdjustTarget(created);
        setAdjustForm({ locationId: locations[0]?.id ?? "", quantity: "", note: "", expiryDate: "" });
        setAdjustIsFirstStock(true);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCategory(rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    const existing = categories.find((c) => c.parentId === null && c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setForm((f) => ({ ...f, categoryId: existing.id }));
      return;
    }
    const code = generateCategoryCode(
      name,
      categories.map((c) => c.code)
    );
    try {
      const created = await api.post<Category>("/categories", { name, code });
      setCategories((prev) => [...prev, created]);
      setForm((f) => ({ ...f, categoryId: created.id }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création de la catégorie");
      throw e;
    }
  }

  async function handleCreateUnit(rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    const existing = units.find((u) => u.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setForm((f) => ({ ...f, unitId: existing.id }));
      return;
    }
    try {
      const created = await api.post<Unit>("/units", { name });
      setUnits((prev) => [...prev, created]);
      setForm((f) => ({ ...f, unitId: created.id }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création de l'unité");
      throw e;
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
    setAdjustForm({ locationId: locations[0]?.id ?? "", quantity: "", note: "", expiryDate: "" });
    setAdjustIsFirstStock(false);
    setError(null);
  }

  async function handleAdjustSubmit(e: FormEvent) {
    e.preventDefault();
    if (!adjustTarget) return;
    setAdjustSaving(true);
    setError(null);
    try {
      await api.post(`/products/${adjustTarget.id}/adjustments`, {
        locationId: adjustForm.locationId,
        quantity: Number(adjustForm.quantity),
        note: adjustForm.note || null,
        expiryDate: Number(adjustForm.quantity) > 0 ? adjustForm.expiryDate || undefined : undefined,
      });
      setAdjustTarget(null);
      setAdjustIsFirstStock(false);
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

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  const sellUnitsTarget = products.find((p) => p.id === sellUnitsTargetId) ?? null;

  const filteredProducts = search
    ? products.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          p.category.name.toLowerCase().includes(q) ||
          p.unit.name.toLowerCase().includes(q)
        );
      })
    : products;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Produits</h1>
          <HelpTooltip text="Cliquez sur « Ajouter » pour créer un produit. Le tableau liste sa catégorie, son unité, ses prix d'achat/vente et son stock total sur tous les emplacements (en rouge si sous le seuil d'alerte)." />
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            Ajouter
          </Button>
        )}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom, référence, catégorie…" className="max-w-sm" />

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Nom</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Catégorie</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Unité</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Prix achat</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Prix vente</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Stock total</th>
              {canWrite && (
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    Actions
                    <HelpTooltip text="« Unités de vente » : ajoute d'autres unités pour vendre ce produit (ex. à la boîte en plus de la pièce). « Ajuster stock » : corrige la quantité en stock. « Modifier » : change les informations du produit. « Désactiver » : le retire des ventes sans supprimer son historique." />
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={canWrite ? 7 : 6} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  {search
                    ? "Aucun résultat"
                    : canWrite
                      ? "Aucun produit. Cliquez sur « Ajouter » pour créer le premier."
                      : "Aucun produit"}
                </td>
              </tr>
            )}
            {filteredProducts.map((p) => (
              <tr key={p.id} className={!p.isActive ? "opacity-40" : ""}>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                  {p.name}
                  {p.sku ? <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">({p.sku})</span> : null}
                </td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
                    {p.category.code}
                  </span>{" "}
                  {p.category.name}
                </td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{p.unit.name}</td>
                <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{formatAmount(p.purchasePrice)}</td>
                <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{formatAmount(p.sellingPrice)}</td>
                <td
                  className={`px-4 py-2 text-right font-medium ${
                    totalStock(p) <= p.alertThreshold ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {totalStock(p)}
                </td>
                {canWrite && (
                  <td className="space-x-2 px-4 py-2 text-right">
                    <button onClick={() => openSellUnits(p)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                      Unités de vente
                    </button>
                    <button onClick={() => openAdjust(p)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                      Ajuster stock
                    </button>
                    <button onClick={() => openEdit(p)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                      Modifier
                    </button>
                    {p.isActive && (
                      <button
                        onClick={() => handleDeactivate(p)}
                        className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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
          <Input
            label={
              <span className="inline-flex items-center gap-1.5">
                Référence (SKU)
                <HelpTooltip text="Code interne optionnel pour retrouver facilement ce produit (ex. code-barres, référence fournisseur). Laissez vide si vous n'en avez pas." />
              </span>
            }
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
          <Select
            label={
              <span className="inline-flex items-center gap-1.5">
                Catégorie
                <HelpTooltip text="Tapez le nom d'une catégorie existante pour la sélectionner. Si elle n'existe pas encore, tapez son nom puis cliquez sur « + Créer » : elle sera créée automatiquement (un code à 3 lettres est généré pour vous)." />
              </span>
            }
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            onCreate={handleCreateCategory}
            createLabel={(q) => `+ Créer la catégorie « ${q} »`}
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
            label={
              <span className="inline-flex items-center gap-1.5">
                Unité
                <HelpTooltip text="Choisissez la plus petite unité dans laquelle le produit peut être vendu (ex. comprimé, pièce, ml — pas « boîte » si elle contient plusieurs pièces). Vous pourrez ajouter des unités de vente plus grandes (ex. la boîte) après l'enregistrement, via « Unités de vente ». Comme pour la catégorie, tapez un nom inexistant puis « + Créer » pour ajouter une nouvelle unité à la volée." />
              </span>
            }
            required
            value={form.unitId}
            onChange={(e) => setForm({ ...form, unitId: e.target.value })}
            onCreate={handleCreateUnit}
            createLabel={(q) => `+ Créer l'unité « ${q} »`}
          >
            <option value="">Sélectionner…</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <AmountInput
              label="Prix d'achat"
              required
              value={form.purchasePrice}
              onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
            />
            <AmountInput
              label={
                <span className="inline-flex items-center gap-1.5">
                  Prix de vente
                  <HelpTooltip text="Prix de vente pour l'unité de stock choisie ci-dessus. D'autres unités de vente avec leur propre prix (ex. vente à la boîte) pourront être ajoutées après l'enregistrement, via « Unités de vente »." />
                </span>
              }
              required
              value={form.sellingPrice}
              onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
            />
          </div>
          <Input
            label={
              <span className="inline-flex items-center gap-1.5">
                Seuil d'alerte stock
                <HelpTooltip text="Quand le stock total tombe à ce niveau ou en dessous, le produit s'affiche en rouge dans la liste et une alerte apparaît sur le tableau de bord." />
              </span>
            }
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
        onClose={() => {
          setAdjustTarget(null);
          setAdjustIsFirstStock(false);
        }}
        title={
          adjustTarget
            ? adjustIsFirstStock
              ? `Stock initial — ${adjustTarget.name}`
              : `Ajuster le stock — ${adjustTarget.name}`
            : "Ajuster le stock"
        }
      >
        {adjustTarget && (
          <form onSubmit={handleAdjustSubmit} className="space-y-3">
            {adjustIsFirstStock && (
              <p className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                Produit créé. Prochaine étape : indiquez son stock initial pour qu'il soit disponible à la vente —
                ou fermez cette fenêtre si vous allez plutôt le réceptionner via une commande fournisseur.
              </p>
            )}
            {adjustTarget.stocks.length > 0 && (
              <ul className="rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
                {adjustTarget.stocks.map((s) => (
                  <li key={s.id} className="flex justify-between border-b border-slate-100 dark:border-slate-800 px-3 py-1 last:border-0">
                    <span className="text-slate-600 dark:text-slate-400">{s.location.name}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{s.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
            <Select
              label={
                <span className="inline-flex items-center gap-1.5">
                  Emplacement
                  <HelpTooltip text="Le stock est suivi séparément pour chaque emplacement/point de vente. Choisissez celui concerné par cet ajustement." />
                </span>
              }
              required
              value={adjustForm.locationId}
              onChange={(e) => setAdjustForm({ ...adjustForm, locationId: e.target.value })}
            >
              <option value="">Sélectionner…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Stock actuel à cet emplacement :{" "}
              {adjustTarget.stocks.find((s) => s.locationId === adjustForm.locationId)?.quantity ?? 0}
            </p>
            {adjustForm.locationId &&
              adjustTarget.batches.filter((b) => b.locationId === adjustForm.locationId).length > 0 && (
                <ul className="rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                  {adjustTarget.batches
                    .filter((b) => b.locationId === adjustForm.locationId)
                    .map((b) => (
                      <li key={b.id} className="flex justify-between border-b border-slate-100 dark:border-slate-800 px-3 py-1 last:border-0">
                        <span className="text-slate-500 dark:text-slate-400">
                          {b.expiryDate ? `Périme le ${new Date(b.expiryDate).toLocaleDateString()}` : "Sans date de péremption"}
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{b.quantityRemaining}</span>
                      </li>
                    ))}
                </ul>
              )}
            <Input
              label={
                <span className="inline-flex items-center gap-1.5">
                  Quantité (positive pour ajouter, négative pour retirer)
                  <HelpTooltip text="C'est une variation à appliquer au stock actuel de cet emplacement, pas la nouvelle quantité totale. Ex. : -2 retire 2 unités, peu importe le stock actuel." />
                </span>
              }
              type="number"
              step="1"
              required
              value={adjustForm.quantity}
              onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
            />
            {Number(adjustForm.quantity) > 0 && (
              <Input
                label={
                  <span className="inline-flex items-center gap-1.5">
                    Date de péremption (optionnel)
                    <HelpTooltip text="Si vous en indiquez une, cette quantité forme un nouveau lot suivi séparément, visible dans « Mouvements de stock » et dans les alertes de péremption du tableau de bord." />
                  </span>
                }
                type="date"
                value={adjustForm.expiryDate}
                onChange={(e) => setAdjustForm({ ...adjustForm, expiryDate: e.target.value })}
              />
            )}
            <Input
              label={
                <span className="inline-flex items-center gap-1.5">
                  Motif (optionnel)
                  <HelpTooltip text="Note libre conservée dans l'historique des mouvements de stock, utile pour se souvenir de la raison de cet ajustement (ex. inventaire, casse, produit périmé)." />
                </span>
              }
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
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Unité de stock : <span className="font-medium">{sellUnitsTarget.unit.name}</span> — prix de base{" "}
              {formatAmount(sellUnitsTarget.sellingPrice)} Ar / {sellUnitsTarget.unit.symbol ?? sellUnitsTarget.unit.name}
            </p>

            {sellUnitsTarget.sellUnits.length > 0 && (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
                {sellUnitsTarget.sellUnits.map((su) => (
                  <li key={su.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-slate-700 dark:text-slate-300">
                      {su.unit.name} = {su.conversionFactor} {sellUnitsTarget.unit.symbol ?? sellUnitsTarget.unit.name} —{" "}
                      {formatAmount(su.sellingPrice)} Ar
                    </span>
                    <button onClick={() => handleDeleteSellUnit(su.id)} className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddSellUnit} className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                Ajouter une unité de vente
                <HelpTooltip text="Permet de vendre ce produit dans une autre unité que celle du stock (ex. vendre par boîte alors que le stock est suivi à la pièce), avec sa propre conversion et son propre prix. Le stock reste toujours suivi dans l'unité de base du produit." />
              </p>
              <Select
                label={
                  <span className="inline-flex items-center gap-1.5">
                    Unité
                    <HelpTooltip text="L'unité utilisée pour cette vente alternative (ex. boîte). Elle doit être différente de l'unité de stock du produit — créez-la d'abord depuis la page Unités si elle n'existe pas encore." />
                  </span>
                }
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
                label={
                  <span className="inline-flex items-center gap-1.5">
                    {`Équivaut à combien de ${sellUnitsTarget.unit.symbol ?? sellUnitsTarget.unit.name} ?`}
                    <HelpTooltip text="Nombre d'unités de stock contenues dans une unité de vente. Ex. si le stock est suivi à la pièce et que la boîte en contient 10, indiquez 10 : vendre une boîte retirera alors 10 pièces du stock." />
                  </span>
                }
                type="number"
                min="1"
                required
                value={newSellUnit.conversionFactor}
                onChange={(e) => setNewSellUnit({ ...newSellUnit, conversionFactor: e.target.value })}
              />
              <AmountInput
                label={
                  <span className="inline-flex items-center gap-1.5">
                    Prix de vente pour cette unité
                    <HelpTooltip text="Prix facturé pour une unité de vente complète (ex. le prix de toute la boîte), indépendant du prix de l'unité de stock renseigné à la création du produit." />
                  </span>
                }
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
