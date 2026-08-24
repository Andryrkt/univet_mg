import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import type { StockMovement } from "../lib/types";

const typeLabel: Record<StockMovement["type"], string> = {
  PURCHASE_RECEPTION: "Réception fournisseur",
  SALE: "Vente",
  ADJUSTMENT: "Ajustement",
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

  if (loading) return <p className="text-slate-400">Chargement…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Mouvements de stock</h1>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Date</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Produit</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Quantité</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Par</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Aucun mouvement
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-slate-700">{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-700">{m.product.name}</td>
                  <td className="px-4 py-2 text-slate-700">{typeLabel[m.type]}</td>
                  <td className={`px-4 py-2 text-right font-medium ${m.quantity >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{m.createdBy.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
