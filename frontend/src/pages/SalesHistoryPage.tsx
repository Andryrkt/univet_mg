import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Sale } from "../lib/types";
import { Modal } from "../components/ui/Modal";

export function SalesHistoryPage() {
  const [searchParams] = useSearchParams();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Sale | null>(null);

  useEffect(() => {
    api
      .get<Sale[]>("/sales")
      .then((data) => {
        setSales(data);
        const highlightId = searchParams.get("sale");
        if (highlightId) {
          const match = data.find((s) => s.id === highlightId);
          if (match) setSelected(match);
        }
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Historique des ventes</h1>
      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Client</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Emplacement</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Vendeur</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  Aucune vente
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr key={s.id} onClick={() => setSelected(s)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{s.client.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{s.location.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{s.seller.name}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                    {Number(s.totalAmount).toFixed(2)} Ar
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
                  <span className="font-medium">{Number(item.subtotal).toFixed(2)} Ar</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2 font-semibold text-slate-900 dark:text-slate-100">
              <span>Total</span>
              <span>{Number(selected.totalAmount).toFixed(2)} Ar</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
