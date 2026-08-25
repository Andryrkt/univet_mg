import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useSettings } from "../context/SettingsContext";
import type { Sale } from "../lib/types";
import { Button } from "../components/ui/Button";
import { formatAmount } from "../lib/format";

const statusLabel: Record<Sale["paymentStatus"], string> = {
  PAID: "Payé",
  PARTIAL: "Paiement partiel",
  UNPAID: "Impayé — à crédit",
};

export function SaleReceiptPrintPage() {
  const { id } = useParams<{ id: string }>();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<Sale>(`/sales/${id}`)
      .then((data) => {
        setSale(data);
        document.title = `Reçu de vente - ${data.client.name}`;
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-6 text-slate-400">Chargement…</p>;
  if (error || !sale) return <p className="p-6 text-red-600">{error ?? "Vente introuvable"}</p>;

  const reference = sale.id.slice(-8).toUpperCase();
  const remaining = Number(sale.totalAmount) - Number(sale.amountPaid);
  const lastPayment = sale.payments[sale.payments.length - 1];
  const change = lastPayment?.cashReceived ? Number(lastPayment.cashReceived) - Number(lastPayment.amount) : 0;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto flex max-w-3xl justify-between px-4 pb-4 print:hidden">
        <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-900">
          ← Retour
        </button>
        <Button onClick={() => window.print()}>Imprimer / Enregistrer en PDF</Button>
      </div>

      <div className="mx-auto max-w-3xl bg-white p-10 shadow-sm print:shadow-none">
        {sale.cancelledAt && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide text-red-700">
            Vente annulée le {new Date(sale.cancelledAt).toLocaleDateString()}
          </div>
        )}

        <div className="mb-8 flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{settings.name}</h1>
            {settings.tagline && <p className="text-sm text-slate-500">{settings.tagline}</p>}
            {settings.address && <p className="text-sm text-slate-500">{settings.address}</p>}
            {settings.phone && <p className="text-sm text-slate-500">{settings.phone}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase tracking-wide text-slate-900">Facture / Reçu</h2>
            <p className="text-sm text-slate-500">Référence : {reference}</p>
            <p className="text-sm text-slate-500">Date : {new Date(sale.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Client</p>
            <p className="font-medium text-slate-900">{sale.client.name}</p>
            <p className="text-sm text-slate-600">{sale.client.phone}</p>
            {sale.client.email && <p className="text-sm text-slate-600">{sale.client.email}</p>}
            {sale.client.address && <p className="text-sm text-slate-600">{sale.client.address}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Vente</p>
            <p className="font-medium text-slate-900">{sale.location.name}</p>
            <p className="mt-2 text-sm text-slate-500">Vendu par {sale.seller.name}</p>
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
            {sale.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-200">
                <td className="py-2 text-slate-700">{item.product.name}</td>
                <td className="py-2 text-right text-slate-700">
                  {item.quantity} {item.unitLabel}
                </td>
                <td className="py-2 text-right text-slate-700">{formatAmount(item.unitPrice)} Ar</td>
                <td className="py-2 text-right text-slate-700">{formatAmount(item.subtotal)} Ar</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-1">
            <div className="flex justify-between border-t-2 border-slate-800 py-2 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatAmount(sale.totalAmount)} Ar</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Payé</span>
              <span>{formatAmount(sale.amountPaid)} Ar</span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between text-sm font-semibold text-red-600">
                <span>Reste dû</span>
                <span>{formatAmount(remaining)} Ar</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-slate-500">
              <span>Statut</span>
              <span>{statusLabel[sale.paymentStatus]}</span>
            </div>
            {lastPayment?.cashReceived && (
              <>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Reçu</span>
                  <span>{formatAmount(lastPayment.cashReceived)} Ar</span>
                </div>
                {change > 0 && (
                  <div className="flex justify-between text-sm font-semibold text-slate-900">
                    <span>Rendu</span>
                    <span>{formatAmount(change)} Ar</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <p className="mt-12 text-center text-sm text-slate-400">Merci de votre confiance.</p>
      </div>
    </div>
  );
}
