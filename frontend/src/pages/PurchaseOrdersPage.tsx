import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { PurchaseOrder, Supplier, Product, Location } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { AmountInput } from "../components/ui/AmountInput";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { PlusIcon } from "../components/ui/icons";
import { SearchInput } from "../components/ui/SearchInput";

type LineForm = { productId: string; quantityOrdered: string; unitPrice: string };

const statusLabel: Record<PurchaseOrder["status"], string> = {
  PENDING: "En attente",
  PARTIALLY_RECEIVED: "Partiellement reçue",
  RECEIVED: "Reçue",
  CANCELLED: "Annulée",
};

const statusColor: Record<PurchaseOrder["status"], string> = {
  PENDING: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
  PARTIALLY_RECEIVED: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300",
  RECEIVED: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300",
  CANCELLED: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
};

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [lines, setLines] = useState<LineForm[]>([{ productId: "", quantityOrdered: "", unitPrice: "" }]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    try {
      const [o, s, p, l] = await Promise.all([
        api.get<PurchaseOrder[]>("/purchase-orders"),
        api.get<Supplier[]>("/suppliers"),
        api.get<Product[]>("/products"),
        api.get<Location[]>("/locations"),
      ]);
      setOrders(o);
      setSuppliers(s);
      setProducts(p);
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

  function updateLine(index: number, patch: Partial<LineForm>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantityOrdered: "", unitPrice: "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setSupplierId("");
    setLocationId("");
    setLines([{ productId: "", quantityOrdered: "", unitPrice: "" }]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/purchase-orders", {
        supplierId,
        locationId,
        items: lines.map((l) => ({
          productId: l.productId,
          quantityOrdered: Number(l.quantityOrdered),
          unitPrice: Number(l.unitPrice),
        })),
      });
      setModalOpen(false);
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  const filteredOrders = search
    ? orders.filter((o) => {
        const q = search.toLowerCase();
        return (
          o.supplier.name.toLowerCase().includes(q) ||
          o.location.name.toLowerCase().includes(q) ||
          statusLabel[o.status].toLowerCase().includes(q)
        );
      })
    : orders;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Commandes fournisseurs</h1>
        <Button onClick={() => setModalOpen(true)}>
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Nouvelle commande
        </Button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par fournisseur, emplacement, statut…" className="max-w-sm" />

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Fournisseur</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Emplacement</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Statut</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Lignes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  {search ? "Aucun résultat" : "Aucune commande"}
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2">
                    <Link to={`/commandes/${o.id}`} className="font-medium text-slate-900 dark:text-slate-100 hover:underline">
                      {o.supplier.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{o.location.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{new Date(o.orderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[o.status]}`}>
                      {statusLabel[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{o.items.length}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle commande fournisseur">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Select label="Fournisseur" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Sélectionner…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <Select
            label="Emplacement destinataire"
            required
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">Sélectionner…</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Lignes de commande</p>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_80px_auto] items-center gap-2">
                <Select value={line.productId} onChange={(e) => updateLine(i, { productId: e.target.value })} required>
                  <option value="">Produit…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min="1"
                  placeholder="Qté"
                  value={line.quantityOrdered}
                  onChange={(e) => updateLine(i, { quantityOrdered: e.target.value })}
                  required
                />
                <AmountInput
                  placeholder="PU"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  disabled={lines.length === 1}
                  className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addLine} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
              + Ajouter une ligne
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Créer la commande"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
