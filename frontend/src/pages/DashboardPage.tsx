import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Product, Sale } from "../lib/types";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get<Product[]>("/products"), api.get<Sale[]>("/sales")])
      .then(([p, s]) => {
        setProducts(p);
        setSales(s);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">Chargement…</p>;

  const activeProducts = products.filter((p) => p.isActive);
  const lowStock = activeProducts.filter((p) => p.stockQuantity <= p.alertThreshold);
  const today = new Date().toDateString();
  const salesToday = sales.filter((s) => new Date(s.createdAt).toDateString() === today);
  const totalToday = salesToday.reduce((sum, s) => sum + Number(s.totalAmount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Tableau de bord</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Produits actifs" value={activeProducts.length} />
        <StatCard label="Ventes aujourd'hui" value={salesToday.length} />
        <StatCard label="Chiffre d'affaires du jour" value={`${totalToday.toFixed(2)} Ar`} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Alertes de stock bas</h2>
        {lowStock.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune alerte, tous les stocks sont au-dessus du seuil.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700">{p.name}</span>
                <span className="font-medium text-red-600">
                  {p.stockQuantity} / seuil {p.alertThreshold}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
