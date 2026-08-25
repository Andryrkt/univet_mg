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

export function SaleTicketPrintPage() {
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
        document.title = `Ticket de caisse - ${data.client.name}`;
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-6 text-slate-400">Chargement…</p>;
  if (error || !sale) return <p className="p-6 text-red-600">{error ?? "Vente introuvable"}</p>;

  const reference = sale.id.slice(-8).toUpperCase();
  const remaining = Number(sale.totalAmount) - Number(sale.amountPaid);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <style>{"@media print { @page { size: 80mm auto; margin: 4mm; } }"}</style>

      <div className="mx-auto flex w-[300px] justify-between pb-4 print:hidden">
        <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-900">
          ← Retour
        </button>
        <Button onClick={() => window.print()}>Imprimer</Button>
      </div>

      <div className="mx-auto w-[300px] bg-white p-4 font-mono text-xs text-slate-900 shadow-sm print:shadow-none">
        {sale.cancelledAt && (
          <p className="mb-2 text-center font-bold uppercase tracking-wide text-red-600">*** Vente annulée ***</p>
        )}

        <div className="text-center">
          <p className="text-sm font-bold">{settings.name}</p>
          {settings.tagline && <p>{settings.tagline}</p>}
          {settings.address && <p>{settings.address}</p>}
          {settings.phone && <p>{settings.phone}</p>}
        </div>

        <div className="my-2 border-t border-dashed border-slate-400" />

        <p>Réf : {reference}</p>
        <p>{new Date(sale.createdAt).toLocaleString()}</p>
        <p>Client : {sale.client.name}</p>
        <p>Vendeur : {sale.seller.name}</p>

        <div className="my-2 border-t border-dashed border-slate-400" />

        {sale.items.map((item) => (
          <div key={item.id} className="mb-1">
            <p>{item.product.name}</p>
            <div className="flex justify-between">
              <span>
                {item.quantity} {item.unitLabel} x {formatAmount(item.unitPrice)}
              </span>
              <span>{formatAmount(item.subtotal)}</span>
            </div>
          </div>
        ))}

        <div className="my-2 border-t border-dashed border-slate-400" />

        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>{formatAmount(sale.totalAmount)} Ar</span>
        </div>
        <div className="flex justify-between">
          <span>Payé</span>
          <span>{formatAmount(sale.amountPaid)} Ar</span>
        </div>
        {remaining > 0 && (
          <div className="flex justify-between font-bold">
            <span>Reste dû</span>
            <span>{formatAmount(remaining)} Ar</span>
          </div>
        )}
        <p className="mt-1">Statut : {statusLabel[sale.paymentStatus]}</p>

        <div className="my-2 border-t border-dashed border-slate-400" />

        <p className="text-center">Merci de votre visite !</p>
      </div>
    </div>
  );
}
