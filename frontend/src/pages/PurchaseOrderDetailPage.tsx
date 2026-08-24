import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { PurchaseOrder } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [received, setReceived] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
      setOrder(data);
      setReceived(
        Object.fromEntries(data.items.map((item) => [item.id, String(item.quantityReceived ?? item.quantityOrdered)]))
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleReceive() {
    if (!order) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/purchase-orders/${order.id}/receive`, {
        items: order.items.map((item) => ({
          purchaseOrderItemId: item.id,
          quantityReceived: Number(received[item.id] ?? 0),
        })),
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la réception");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!order || !confirm("Annuler cette commande ?")) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/purchase-orders/${order.id}`, { status: "CANCELLED" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400">Chargement…</p>;
  if (!order) return <p className="text-red-600">Commande introuvable</p>;

  const total = order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantityOrdered, 0);

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/commandes")} className="text-sm text-slate-500 hover:text-slate-900">
        ← Retour
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Commande — {order.supplier.name}</h1>
          <p className="text-sm text-slate-500">
            Créée le {new Date(order.orderDate).toLocaleDateString()} par {order.createdBy.name}
          </p>
        </div>
        {order.status === "PENDING" && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleCancel} disabled={saving}>
              Annuler la commande
            </Button>
            <Button onClick={handleReceive} disabled={saving}>
              {saving ? "Traitement…" : "Réceptionner"}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Produit</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Qté commandée</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">PU</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Qté reçue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 text-slate-700">{item.product.name}</td>
                <td className="px-4 py-2 text-right text-slate-700">{item.quantityOrdered}</td>
                <td className="px-4 py-2 text-right text-slate-700">{Number(item.unitPrice).toFixed(2)}</td>
                <td className="px-4 py-2 text-right">
                  {order.status === "PENDING" ? (
                    <Input
                      type="number"
                      min="0"
                      className="w-24 text-right"
                      value={received[item.id] ?? ""}
                      onChange={(e) => setReceived((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    />
                  ) : (
                    <span className="text-slate-700">{item.quantityReceived ?? "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right font-medium text-slate-600">
                Total commandé
              </td>
              <td className="px-4 py-2 text-right font-semibold text-slate-900">{total.toFixed(2)} Ar</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
