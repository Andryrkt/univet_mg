import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Product, Sale } from "../lib/types";
import { formatAmount } from "../lib/format";
import { useSettings } from "../context/SettingsContext";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

type LowStockAlert = { productId: string; productName: string; locationName: string; quantity: number; alertThreshold: number };

type ExpiringBatch = {
  batchId: string;
  productName: string;
  locationName: string;
  quantity: number;
  expiryDate: string;
  daysLeft: number;
};

export function DashboardPage() {
  const { settings } = useSettings();
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

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  const activeProducts = products.filter((p) => p.isActive);
  const lowStock: LowStockAlert[] = activeProducts.flatMap((p) =>
    p.stocks
      .filter((s) => s.quantity <= p.alertThreshold)
      .map((s) => ({
        productId: p.id,
        productName: p.name,
        locationName: s.location.name,
        quantity: s.quantity,
        alertThreshold: p.alertThreshold,
      }))
  );
  const today = new Date().toDateString();
  const salesToday = sales.filter((s) => new Date(s.createdAt).toDateString() === today);
  const totalToday = salesToday.reduce((sum, s) => sum + Number(s.totalAmount), 0);

  const now = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;
  const expiring: ExpiringBatch[] = activeProducts
    .flatMap((p) =>
      p.batches
        .filter((b) => b.expiryDate)
        .map((b) => ({
          batchId: b.id,
          productName: p.name,
          locationName: b.location.name,
          quantity: b.quantityRemaining,
          expiryDate: b.expiryDate as string,
          daysLeft: Math.ceil((new Date(b.expiryDate as string).getTime() - now) / msPerDay),
        }))
    )
    .filter((b) => b.daysLeft <= settings.expiryAlertDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Tableau de bord</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Produits actifs" value={activeProducts.length} />
        <StatCard label="Ventes aujourd'hui" value={salesToday.length} />
        <StatCard label="Chiffre d'affaires du jour" value={`${formatAmount(totalToday)} Ar`} />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">Alertes de stock bas</h2>
        {lowStock.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Aucune alerte, tous les stocks sont au-dessus du seuil.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {lowStock.map((a) => (
              <li key={`${a.productId}-${a.locationName}`} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300">
                  {a.productName} <span className="text-slate-400 dark:text-slate-500">— {a.locationName}</span>
                </span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {a.quantity} / seuil {a.alertThreshold}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">Produits qui périment bientôt</h2>
        {expiring.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Aucun lot ne périme dans les {settings.expiryAlertDays} prochains jours.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {expiring.map((b) => (
              <li key={b.batchId} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300">
                  {b.productName} <span className="text-slate-400 dark:text-slate-500">— {b.locationName}</span>
                  <span className="text-slate-400 dark:text-slate-500"> · {b.quantity} unité(s)</span>
                </span>
                <span className={`font-medium ${b.daysLeft < 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {new Date(b.expiryDate).toLocaleDateString()}
                  {" — "}
                  {b.daysLeft < 0 ? `périmé depuis ${Math.abs(b.daysLeft)} j` : `dans ${b.daysLeft} j`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
