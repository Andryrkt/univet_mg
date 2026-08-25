import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { PurchaseOrder, Supplier, Product } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";

type LineForm = { productId: string; quantityOrdered: string; unitPrice: string };

const statusLabel: Record<PurchaseOrder["status"], string> = {
  PENDING: "En attente",
  PARTIALLY_RECEIVED: "Partiellement reçue",
  RECEIVED: "Reçue",
  CANCELLED: "Annulée",
};

const statusColor: Record<PurchaseOrder["status"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PARTIALLY_RECEIVED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<LineForm[]>([{ productId: "", quantityOrdered: "", unitPrice: "" }]);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [o, s, p] = await Promise.all([
        api.get<PurchaseOrder[]>("/purchase-orders"),
        api.get<Supplier[]>("/suppliers"),
        api.get<Product[]>("/products"),
      ]);
      setOrders(o);
      setSuppliers(s);
      setProducts(p);
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
    setLines([{ productId: "", quantityOrdered: "", unitPrice: "" }]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/purchase-orders", {
        supplierId,
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

  if (loading) return <p className="text-slate-400">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Commandes fournisseurs</h1>
        <Button onClick={() => setModalOpen(true)}>+ Nouvelle commande</Button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Fournisseur</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Date</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Statut</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Lignes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Aucune commande
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2">
                    <Link to={`/commandes/${o.id}`} className="font-medium text-slate-900 hover:underline">
                      {o.supplier.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{new Date(o.orderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[o.status]}`}>
                      {statusLabel[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700">{o.items.length}</td>
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

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Lignes de commande</p>
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
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="PU"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  disabled={lines.length === 1}
                  className="text-sm text-red-500 hover:text-red-700 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addLine} className="text-sm text-slate-500 hover:text-slate-900">
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
