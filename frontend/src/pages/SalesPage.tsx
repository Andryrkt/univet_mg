import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Client, Product } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";

type CartLine = { productId: string; quantity: number };

export function SalesPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get<Client[]>("/clients"), api.get<Product[]>("/products")])
      .then(([c, p]) => {
        setClients(c);
        setProducts(p.filter((pr) => pr.isActive));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  function addProduct(productId: string) {
    if (!productId) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)));
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  const total = cart.reduce((sum, line) => {
    const product = products.find((p) => p.id === line.productId);
    return sum + (product ? Number(product.sellingPrice) * line.quantity : 0);
  }, 0);

  async function handleSubmit() {
    if (!clientId || cart.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const sale = await api.post<{ id: string }>("/sales", {
        clientId,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      setCart([]);
      navigate(`/historique-ventes?sale=${sale.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la vente");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400">Chargement…</p>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <h1 className="text-xl font-semibold text-slate-900">Point de vente</h1>
        <Select value="" onChange={(e) => addProduct(e.target.value)}>
          <option value="">Ajouter un produit…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {Number(p.sellingPrice).toFixed(2)} Ar (stock: {p.stockQuantity})
            </option>
          ))}
        </Select>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Produit</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">PU</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Qté</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Sous-total</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Panier vide
                  </td>
                </tr>
              ) : (
                cart.map((line) => {
                  const product = products.find((p) => p.id === line.productId);
                  if (!product) return null;
                  return (
                    <tr key={line.productId}>
                      <td className="px-4 py-2 text-slate-700">{product.name}</td>
                      <td className="px-4 py-2 text-right text-slate-700">{Number(product.sellingPrice).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="1"
                          max={product.stockQuantity}
                          value={line.quantity}
                          onChange={(e) => updateQuantity(line.productId, Number(e.target.value))}
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-slate-700">
                        {(Number(product.sellingPrice) * line.quantity).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => removeLine(line.productId)} className="text-sm text-red-500 hover:text-red-700">
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
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Client</h2>
          <Select label="Client" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Sélectionner…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-lg font-semibold text-slate-900">
            <span>Total</span>
            <span>{total.toFixed(2)} Ar</span>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button className="w-full" onClick={handleSubmit} disabled={saving || !clientId || cart.length === 0}>
            {saving ? "Validation…" : "Valider la vente"}
          </Button>
        </div>
      </div>
    </div>
  );
}
