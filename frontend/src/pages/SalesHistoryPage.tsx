import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Sale } from "../lib/types";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { formatAmount } from "../lib/format";
import { SearchInput } from "../components/ui/SearchInput";

const statusLabel: Record<Sale["paymentStatus"], string> = {
  PAID: "Payé",
  PARTIAL: "Partiel",
  UNPAID: "Impayé",
};

const statusClass: Record<Sale["paymentStatus"], string> = {
  PAID: "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300",
  PARTIAL: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
  UNPAID: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300",
};

export function SalesHistoryPage() {
  const [searchParams] = useSearchParams();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [search, setSearch] = useState("");

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    try {
      const data = await api.get<Sale[]>("/sales");
      setSales(data);
      return data;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
      return [];
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    load(true).then((data) => {
      const highlightId = searchParams.get("sale");
      if (highlightId) {
        const match = data.find((s) => s.id === highlightId);
        if (match) setSelected(match);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRecordPayment(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setPaymentSaving(true);
    setPaymentError(null);
    try {
      const updated = await api.post<Sale>(`/sales/${selected.id}/payments`, { amount: Number(paymentAmount) });
      setSelected(updated);
      setPaymentAmount("");
      await load();
    } catch (e) {
      setPaymentError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement du paiement");
    } finally {
      setPaymentSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  const filteredSales = search
    ? sales.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.client.name.toLowerCase().includes(q) ||
          s.location.name.toLowerCase().includes(q) ||
          s.seller.name.toLowerCase().includes(q)
        );
      })
    : sales;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Historique des ventes</h1>

      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par client, emplacement, vendeur…" className="max-w-sm" />

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Client</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Emplacement</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Vendeur</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Paiement</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  {search ? "Aucun résultat" : "Aucune vente"}
                </td>
              </tr>
            ) : (
              filteredSales.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => {
                    setSelected(s);
                    setPaymentAmount("");
                    setPaymentError(null);
                  }}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{s.client.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{s.location.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{s.seller.name}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[s.paymentStatus]}`}>
                      {statusLabel[s.paymentStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                    {formatAmount(s.totalAmount)} Ar
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détail de la vente">
        {selected && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {new Date(selected.createdAt).toLocaleString()} · {selected.client.name} · {selected.location.name} · vendu par{" "}
              {selected.seller.name}
            </p>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {selected.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2">
                  <span>
                    {item.product.name} × {item.quantity} {item.unitLabel}
                  </span>
                  <span className="font-medium">{formatAmount(item.subtotal)} Ar</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2 font-semibold text-slate-900 dark:text-slate-100">
              <span>Total</span>
              <span>{formatAmount(selected.totalAmount)} Ar</span>
            </div>

            <div className="space-y-2 rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Statut</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[selected.paymentStatus]}`}>
                  {statusLabel[selected.paymentStatus]}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                <span>Payé</span>
                <span>{formatAmount(selected.amountPaid)} Ar</span>
              </div>
              {selected.paymentStatus !== "PAID" && (
                <div className="flex items-center justify-between text-sm font-medium text-amber-600 dark:text-amber-400">
                  <span>Reste dû</span>
                  <span>{formatAmount(Number(selected.totalAmount) - Number(selected.amountPaid))} Ar</span>
                </div>
              )}

              {selected.payments.length > 0 && (
                <ul className="space-y-1 border-t border-slate-200 dark:border-slate-800 pt-2 text-xs text-slate-500 dark:text-slate-400">
                  {selected.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      <span>
                        {new Date(p.createdAt).toLocaleString()} · {p.createdBy.name}
                      </span>
                      <span>{formatAmount(p.amount)} Ar</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selected.paymentStatus !== "PAID" && (
              <form onSubmit={handleRecordPayment} className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                {paymentError && (
                  <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{paymentError}</p>
                )}
                <Input
                  label="Enregistrer un paiement"
                  type="number"
                  min="0"
                  max={Number(selected.totalAmount) - Number(selected.amountPaid)}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                <Button type="submit" className="w-full" disabled={paymentSaving}>
                  {paymentSaving ? "Enregistrement…" : "Enregistrer le paiement"}
                </Button>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
