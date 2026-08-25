import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Client, Location, Product } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { PlusIcon } from "../components/ui/icons";
import { formatAmount } from "../lib/format";

const emptyClientForm = { name: "", phone: "", email: "", address: "" };

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

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [clientSaving, setClientSaving] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const [paymentMode, setPaymentMode] = useState<"full" | "partial" | "unpaid">("full");
  const [partialAmount, setPartialAmount] = useState("");

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

  const amountPaid =
    paymentMode === "full" ? total : paymentMode === "unpaid" ? 0 : Number(partialAmount) || 0;
  const remaining = total - amountPaid;

  async function handleSubmit() {
    if (!clientId || !locationId || cart.length === 0) return;
    if (paymentMode === "partial" && (amountPaid <= 0 || amountPaid >= total)) {
      setError("Le montant payé partiel doit être compris entre 0 et le total (exclus)");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const sale = await api.post<{ id: string }>("/sales", {
        clientId,
        locationId,
        amountPaid,
        items: cart.map((l) => {
          const option = options.find((o) => o.key === l.key)!;
          return { productId: option.productId, sellUnitId: option.sellUnitId, quantity: l.quantity };
        }),
      });
      setCart([]);
      setPaymentMode("full");
      setPartialAmount("");
      navigate(`/historique-ventes?sale=${sale.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la vente");
    } finally {
      setSaving(false);
    }
  }

  function openClientModal() {
    setClientForm(emptyClientForm);
    setClientError(null);
    setClientModalOpen(true);
  }

  async function handleCreateClient(e: FormEvent) {
    e.preventDefault();
    setClientSaving(true);
    setClientError(null);
    try {
      const newClient = await api.post<Client>("/clients", {
        ...clientForm,
        email: clientForm.email || null,
        address: clientForm.address || null,
      });
      setClients((prev) => [...prev, newClient]);
      setClientId(newClient.id);
      setClientModalOpen(false);
    } catch (e) {
      setClientError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setClientSaving(false);
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
              {o.productName} — {formatAmount(o.unitPrice)} Ar ({o.unitLabel}, stock: {o.maxQuantity})
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
                      <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{formatAmount(option.unitPrice)}</td>
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
                        {formatAmount(option.unitPrice * line.quantity)}
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
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Client</h2>
            <button
              type="button"
              onClick={openClientModal}
              className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Nouveau client
            </button>
          </div>
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
            <span>{formatAmount(total)} Ar</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Paiement</label>
            <div className="flex flex-col gap-1.5 text-sm text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === "full"}
                  onChange={() => setPaymentMode("full")}
                />
                Payé intégralement
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === "partial"}
                  onChange={() => setPaymentMode("partial")}
                />
                Paiement partiel (reste dû)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMode === "unpaid"}
                  onChange={() => setPaymentMode("unpaid")}
                />
                Client sans porte-monnaie — à crédit
              </label>
            </div>
            {paymentMode === "partial" && (
              <Input
                label="Montant payé maintenant"
                type="number"
                min="0"
                max={total}
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
              />
            )}
            {paymentMode !== "full" && (
              <p className="text-sm text-amber-600 dark:text-amber-400">Reste à payer : {formatAmount(remaining)} Ar</p>
            )}
          </div>

          {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
          <Button className="w-full" onClick={handleSubmit} disabled={saving || !clientId || !locationId || cart.length === 0}>
            {saving ? "Validation…" : "Valider la vente"}
          </Button>
        </div>
      </div>

      <Modal open={clientModalOpen} onClose={() => setClientModalOpen(false)} title="Nouveau client">
        <form onSubmit={handleCreateClient} className="space-y-3">
          {clientError && (
            <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{clientError}</p>
          )}
          <Input
            label="Nom"
            required
            value={clientForm.name}
            onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
          />
          <Input
            label="Téléphone"
            required
            value={clientForm.phone}
            onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={clientForm.email}
            onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
          />
          <Input
            label="Adresse"
            value={clientForm.address}
            onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setClientModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={clientSaving}>
              {clientSaving ? "Enregistrement…" : "Créer et sélectionner"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
