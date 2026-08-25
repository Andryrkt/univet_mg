import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useSettings } from "../context/SettingsContext";
import type { PurchaseOrder } from "../lib/types";
import { Button } from "../components/ui/Button";
import { formatAmount } from "../lib/format";

export function PurchaseOrderPrintPage() {
  const { id } = useParams<{ id: string }>();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<PurchaseOrder>(`/purchase-orders/${id}`)
      .then((data) => {
        setOrder(data);
        document.title = `Bon de commande - ${data.supplier.name}`;
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-6 text-slate-400">Chargement…</p>;
  if (error || !order) return <p className="p-6 text-red-600">{error ?? "Commande introuvable"}</p>;

  const total = order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantityOrdered, 0);
  const reference = order.id.slice(-8).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto flex max-w-3xl justify-between px-4 pb-4 print:hidden">
        <button onClick={() => navigate(`/commandes/${order.id}`)} className="text-sm text-slate-500 hover:text-slate-900">
          ← Retour à la commande
        </button>
        <Button onClick={() => window.print()}>Imprimer / Enregistrer en PDF</Button>
      </div>

      <div className="mx-auto max-w-3xl bg-white p-10 shadow-sm print:shadow-none">
        <div className="mb-8 flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{settings.name}</h1>
            {settings.tagline && <p className="text-sm text-slate-500">{settings.tagline}</p>}
            {settings.address && <p className="text-sm text-slate-500">{settings.address}</p>}
            {settings.phone && <p className="text-sm text-slate-500">{settings.phone}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase tracking-wide text-slate-900">Bon de commande</h2>
            <p className="text-sm text-slate-500">Référence : {reference}</p>
            <p className="text-sm text-slate-500">Date : {new Date(order.orderDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Fournisseur</p>
            <p className="font-medium text-slate-900">{order.supplier.name}</p>
            {order.supplier.contactName && <p className="text-sm text-slate-600">{order.supplier.contactName}</p>}
            {order.supplier.phone && <p className="text-sm text-slate-600">{order.supplier.phone}</p>}
            {order.supplier.email && <p className="text-sm text-slate-600">{order.supplier.email}</p>}
            {order.supplier.address && <p className="text-sm text-slate-600">{order.supplier.address}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Livrer à</p>
            <p className="font-medium text-slate-900">{order.location.name}</p>
            {order.location.address && <p className="text-sm text-slate-600">{order.location.address}</p>}
            <p className="mt-2 text-sm text-slate-500">Émis par {order.createdBy.name}</p>
          </div>
        </div>

        <table className="mb-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="py-2 text-left font-semibold text-slate-900">Produit</th>
              <th className="py-2 text-right font-semibold text-slate-900">Quantité</th>
              <th className="py-2 text-right font-semibold text-slate-900">Prix unitaire</th>
              <th className="py-2 text-right font-semibold text-slate-900">Sous-total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-200">
                <td className="py-2 text-slate-700">{item.product.name}</td>
                <td className="py-2 text-right text-slate-700">
                  {item.quantityOrdered} {item.product.unit.symbol ?? item.product.unit.name}
                </td>
                <td className="py-2 text-right text-slate-700">{formatAmount(item.unitPrice)} Ar</td>
                <td className="py-2 text-right text-slate-700">
                  {formatAmount(Number(item.unitPrice) * item.quantityOrdered)} Ar
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-56">
            <div className="flex justify-between border-t-2 border-slate-800 py-2 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatAmount(total)} Ar</span>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-6 text-sm text-slate-500">
          <div>
            <p className="mb-8">Signature du cabinet</p>
            <p className="border-t border-slate-300 pt-1">{settings.name}</p>
          </div>
          <div>
            <p className="mb-8">Signature du fournisseur</p>
            <p className="border-t border-slate-300 pt-1">{order.supplier.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
