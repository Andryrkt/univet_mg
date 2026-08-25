import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { StockMovement } from "../lib/types";

const typeLabel: Record<StockMovement["type"], string> = {
  PURCHASE_RECEPTION: "Réception fournisseur",
  SALE: "Vente",
  ADJUSTMENT: "Ajustement",
  TRANSFER_OUT: "Transfert (sortie)",
  TRANSFER_IN: "Transfert (entrée)",
};

export function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<StockMovement[]>("/stock-movements")
      .then(setMovements)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Mouvements de stock</h1>
      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Produit</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Emplacement</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Type</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Quantité</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Par</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  Aucun mouvement
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{m.product.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{m.location.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{typeLabel[m.type]}</td>
                  <td className={`px-4 py-2 text-right font-medium ${m.quantity >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{m.createdBy.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
