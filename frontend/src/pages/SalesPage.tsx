import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Client, Location, Product } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";

type SellOption = {
  key: string;
  productId: string;
  sellUnitId?: string;
  productName: string;
  unitLabel: string;
  unitPrice: number;
  conversionFactor: number;
  maxQuantity: number;
};

type CartLine = { key: string; quantity: number };

function buildSellOptions(products: Product[], locationId: string): SellOption[] {
  const options: SellOption[] = [];
  for (const p of products) {
    const stockAtLocation = p.stocks.find((s) => s.locationId === locationId)?.quantity ?? 0;
    options.push({
      key: `${p.id}:base`,
      productId: p.id,
      productName: p.name,
      unitLabel: p.unit.symbol ?? p.unit.name,
      unitPrice: Number(p.sellingPrice),
      conversionFactor: 1,
      maxQuantity: stockAtLocation,
    });
    for (const su of p.sellUnits) {
      options.push({
        key: `${p.id}:${su.id}`,
        productId: p.id,
        sellUnitId: su.id,
        productName: p.name,
        unitLabel: su.unit.symbol ?? su.unit.name,
        unitPrice: Number(su.sellingPrice),
        conversionFactor: su.conversionFactor,
        maxQuantity: Math.floor(stockAtLocation / su.conversionFactor),
      });
    }
  }
  return options;
}

export function SalesPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [clientId, setClientId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get<Client[]>("/clients"), api.get<Product[]>("/products"), api.get<Location[]>("/locations")])
      .then(([c, p, l]) => {
        setClients(c);
        setProducts(p.filter((pr) => pr.isActive));
        const activeLocations = l.filter((loc) => loc.isActive);
        setLocations(activeLocations);
        setLocationId(activeLocations[0]?.id ?? "");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const options = buildSellOptions(products, locationId);

  function changeLocation(newLocationId: string) {
    setLocationId(newLocationId);
    setCart([]);
  }

  function addOption(key: string) {
    if (!key) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { key, quantity: 1 }];
    });
  }

  function updateQuantity(key: string, quantity: number) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, quantity } : l)));
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  const total = cart.reduce((sum, line) => {
    const option = options.find((o) => o.key === line.key);
    return sum + (option ? option.unitPrice * line.quantity : 0);
  }, 0);

  async function handleSubmit() {
    if (!clientId || !locationId || cart.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const sale = await api.post<{ id: string }>("/sales", {
        clientId,
        locationId,
        items: cart.map((l) => {
          const option = options.find((o) => o.key === l.key)!;
          return { productId: option.productId, sellUnitId: option.sellUnitId, quantity: l.quantity };
        }),
      });
      setCart([]);
      navigate(`/historique-ventes?sale=${sale.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la vente");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Point de vente</h1>
        <Select label="Emplacement" required value={locationId} onChange={(e) => changeLocation(e.target.value)}>
          <option value="">Sélectionner…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <Select value="" onChange={(e) => addOption(e.target.value)} disabled={!locationId}>
          <option value="">Ajouter un produit…</option>
          {options.map((o) => (
            <option key={o.key} value={o.key} disabled={o.maxQuantity <= 0}>
              {o.productName} — {o.unitPrice.toFixed(2)} Ar ({o.unitLabel}, stock: {o.maxQuantity})
            </option>
          ))}
        </Select>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Produit</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">PU</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Qté</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Sous-total</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                    Panier vide
                  </td>
                </tr>
              ) : (
                cart.map((line) => {
                  const option = options.find((o) => o.key === line.key);
                  if (!option) return null;
                  return (
                    <tr key={line.key}>
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                        {option.productName} <span className="text-xs text-slate-400 dark:text-slate-500">({option.unitLabel})</span>
                      </td>
                      <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{option.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="1"
                          max={option.maxQuantity}
                          value={line.quantity}
                          onChange={(e) => updateQuantity(line.key, Number(e.target.value))}
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-right text-sm text-slate-900 dark:text-slate-100"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                        {(option.unitPrice * line.quantity).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => removeLine(line.key)} className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Client</h2>
          <Select label="Client" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Sélectionner…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-lg font-semibold text-slate-900 dark:text-slate-100">
            <span>Total</span>
            <span>{total.toFixed(2)} Ar</span>
          </div>
          {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
          <Button className="w-full" onClick={handleSubmit} disabled={saving || !clientId || !locationId || cart.length === 0}>
            {saving ? "Validation…" : "Valider la vente"}
          </Button>
        </div>
      </div>
    </div>
  );
}
