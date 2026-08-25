import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { PurchaseOrder, ReceptionBatch } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

const statusLabel: Record<PurchaseOrder["status"], string> = {
  PENDING: "En attente",
  PARTIALLY_RECEIVED: "Partiellement reçue",
  RECEIVED: "Reçue",
  CANCELLED: "Annulée",
};

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [receptions, setReceptions] = useState<ReceptionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiveNow, setReceiveNow] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function load(showSpinner = false) {
    if (!id) return;
    if (showSpinner) setLoading(true);
    try {
      const [data, receptionData] = await Promise.all([
        api.get<PurchaseOrder>(`/purchase-orders/${id}`),
        api.get<ReceptionBatch[]>(`/purchase-orders/${id}/receptions`),
      ]);
      setOrder(data);
      setReceptions(receptionData);
      setReceiveNow(
        Object.fromEntries(
          data.items.map((item) => [item.id, String(Math.max(item.quantityOrdered - item.quantityReceived, 0))])
        )
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canReceive = order?.status === "PENDING" || order?.status === "PARTIALLY_RECEIVED";

  async function handleReceive() {
    if (!order) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/purchase-orders/${order.id}/receive`, {
        items: order.items.map((item) => ({
          purchaseOrderItemId: item.id,
          quantityReceivedNow: Number(receiveNow[item.id] ?? 0),
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

  async function handleClose() {
    if (!order) return;
    if (!confirm("Clôturer cette commande ? Le solde restant ne sera jamais reçu ; le stock déjà réceptionné est conservé.")) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/purchase-orders/${order.id}`, { status: "RECEIVED" });
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
            Créée le {new Date(order.orderDate).toLocaleDateString()} par {order.createdBy.name} ·{" "}
            <span className="font-medium">{statusLabel[order.status]}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/commandes/${order.id}/imprimer`} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">Générer le bon de commande</Button>
          </Link>
          {order.status === "PENDING" && (
            <Button variant="secondary" onClick={handleCancel} disabled={saving}>
              Annuler la commande
            </Button>
          )}
          {order.status === "PARTIALLY_RECEIVED" && (
            <Button variant="secondary" onClick={handleClose} disabled={saving}>
              Clôturer (solde non livré)
            </Button>
          )}
          {canReceive && (
            <Button onClick={handleReceive} disabled={saving}>
              {saving ? "Traitement…" : "Réceptionner"}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Produit</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Commandé</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">PU</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Déjà reçu</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Reste</th>
              {canReceive && <th className="px-4 py-2 text-right font-medium text-slate-600">À réceptionner</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((item) => {
              const remaining = item.quantityOrdered - item.quantityReceived;
              return (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-slate-700">{item.product.name}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{item.quantityOrdered}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{Number(item.unitPrice).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{item.quantityReceived}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{remaining}</td>
                  {canReceive && (
                    <td className="px-4 py-2 text-right">
                      {remaining > 0 ? (
                        <Input
                          type="number"
                          min="0"
                          max={remaining}
                          className="w-24 text-right"
                          value={receiveNow[item.id] ?? ""}
                          onChange={(e) => setReceiveNow((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={canReceive ? 5 : 4} className="px-4 py-2 text-right font-medium text-slate-600">
                Total commandé
              </td>
              <td className="px-4 py-2 text-right font-semibold text-slate-900">{total.toFixed(2)} Ar</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {receptions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-900">Historique des réceptions</h2>
          <ul className="divide-y divide-slate-100">
            {receptions.map((batch) => (
              <li key={batch.createdAt} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="text-slate-700">{new Date(batch.createdAt).toLocaleString()}</span>
                  <span className="text-slate-400"> · {batch.createdBy.name} · </span>
                  <span className="text-slate-600">
                    {batch.lines.map((l) => `${l.quantity} ${l.unitLabel} ${l.productName}`).join(", ")}
                  </span>
                </div>
                <Link
                  to={`/commandes/${order.id}/reception/imprimer?at=${encodeURIComponent(batch.createdAt)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm text-slate-500 hover:text-slate-900"
                >
                  Imprimer le bon de réception
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
