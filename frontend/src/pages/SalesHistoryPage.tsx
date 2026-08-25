import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Product, Sale } from "../lib/types";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { formatAmount } from "../lib/format";
import { SearchInput } from "../components/ui/SearchInput";
import { useAuth } from "../context/AuthContext";
import { buildSellOptions } from "./SalesPage";

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
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const [searchParams] = useSearchParams();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [search, setSearch] = useState("");

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCashReceived, setPaymentCashReceived] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [addOptionKey, setAddOptionKey] = useState("");
  const [addQuantity, setAddQuantity] = useState("1");
  const [addPaymentMode, setAddPaymentMode] = useState<"full" | "partial" | "unpaid">("full");
  const [addPartialAmount, setAddPartialAmount] = useState("");
  const [addCashReceived, setAddCashReceived] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  async function loadProducts() {
    try {
      const data = await api.get<Product[]>("/products");
      setProducts(data.filter((p) => p.isActive));
    } catch {
      // Non bloquant : le formulaire d'ajout de produits sera simplement vide.
    }
  }

  function resetSaleForms() {
    setPaymentAmount("");
    setPaymentCashReceived("");
    setPaymentError(null);
    setAddOptionKey("");
    setAddQuantity("1");
    setAddPaymentMode("full");
    setAddPartialAmount("");
    setAddCashReceived("");
    setAddError(null);
    setCancelError(null);
  }

  useEffect(() => {
    load(true).then((data) => {
      const highlightId = searchParams.get("sale");
      if (highlightId) {
        const match = data.find((s) => s.id === highlightId);
        if (match) setSelected(match);
      }
    });
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paymentAmountValue = Number(paymentAmount) || 0;
  const paymentChange =
    paymentCashReceived && paymentAmountValue > 0 ? Math.max(0, Number(paymentCashReceived) - paymentAmountValue) : 0;

  async function handleRecordPayment(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (paymentCashReceived && Number(paymentCashReceived) < paymentAmountValue) {
      setPaymentError("Le montant reçu ne peut pas être inférieur au montant payé");
      return;
    }
    setPaymentSaving(true);
    setPaymentError(null);
    try {
      const updated = await api.post<Sale>(`/sales/${selected.id}/payments`, {
        amount: paymentAmountValue,
        cashReceived: paymentCashReceived ? Number(paymentCashReceived) : undefined,
      });
      setSelected(updated);
      setPaymentAmount("");
      setPaymentCashReceived("");
      await load();
    } catch (e) {
      setPaymentError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement du paiement");
    } finally {
      setPaymentSaving(false);
    }
  }

  const addOptions = selected ? buildSellOptions(products, selected.location.id) : [];
  const selectedAddOption = addOptions.find((o) => o.key === addOptionKey);
  const addSubtotal = selectedAddOption ? selectedAddOption.unitPrice * (Number(addQuantity) || 0) : 0;
  const addChange =
    addPaymentMode === "full" && addCashReceived ? Math.max(0, Number(addCashReceived) - addSubtotal) : 0;

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    if (!selected || !selectedAddOption) return;
    const quantity = Number(addQuantity) || 0;
    if (quantity <= 0) return;
    const amountPaid =
      addPaymentMode === "full" ? addSubtotal : addPaymentMode === "unpaid" ? 0 : Number(addPartialAmount) || 0;
    if (addPaymentMode === "partial" && (amountPaid <= 0 || amountPaid >= addSubtotal)) {
      setAddError("Le montant payé partiel doit être compris entre 0 et le sous-total (exclus)");
      return;
    }
    if (addPaymentMode === "full" && addCashReceived && Number(addCashReceived) < addSubtotal) {
      setAddError("Le montant reçu ne peut pas être inférieur au sous-total");
      return;
    }
    setAddSaving(true);
    setAddError(null);
    try {
      const updated = await api.post<Sale>(`/sales/${selected.id}/items`, {
        items: [{ productId: selectedAddOption.productId, sellUnitId: selectedAddOption.sellUnitId, quantity }],
        amountPaid,
        cashReceived: addPaymentMode === "full" && addCashReceived ? Number(addCashReceived) : undefined,
      });
      setSelected(updated);
      setAddOptionKey("");
      setAddQuantity("1");
      setAddPaymentMode("full");
      setAddPartialAmount("");
      setAddCashReceived("");
      await Promise.all([load(), loadProducts()]);
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : "Erreur lors de l'ajout");
    } finally {
      setAddSaving(false);
    }
  }

  async function handleCancel() {
    if (!selected) return;
    if (!confirm("Annuler cette vente ? Le stock vendu sera remis en stock.")) return;
    const reason = window.prompt("Motif de l'annulation (optionnel)") || undefined;
    setCancelSaving(true);
    setCancelError(null);
    try {
      const updated = await api.post<Sale>(`/sales/${selected.id}/cancel`, { reason });
      setSelected(updated);
      await Promise.all([load(), loadProducts()]);
    } catch (e) {
      setCancelError(e instanceof ApiError ? e.message : "Erreur lors de l'annulation");
    } finally {
      setCancelSaving(false);
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
                    resetSaleForms();
                  }}
                  className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${s.cancelledAt ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{s.client.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{s.location.name}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{s.seller.name}</td>
                  <td className="px-4 py-2">
                    {s.cancelledAt ? (
                      <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                        Annulée
                      </span>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[s.paymentStatus]}`}>
                        {statusLabel[s.paymentStatus]}
                      </span>
                    )}
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
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {new Date(selected.createdAt).toLocaleString()} · {selected.client.name} · {selected.location.name} · vendu par{" "}
                {selected.seller.name}
              </p>
              <div className="flex shrink-0 gap-3">
                <Link
                  to={`/ventes/${selected.id}/imprimer`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Facture
                </Link>
                <Link
                  to={`/ventes/${selected.id}/ticket`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Ticket de caisse
                </Link>
              </div>
            </div>

            {selected.cancelledAt && (
              <p className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
                Vente annulée le {new Date(selected.cancelledAt).toLocaleString()} par {selected.cancelledBy?.name}
                {selected.cancelReason ? ` — ${selected.cancelReason}` : ""}
                {Number(selected.amountPaid) > 0 ? ` (${formatAmount(selected.amountPaid)} Ar avaient été encaissés — à rembourser si nécessaire)` : ""}
              </p>
            )}

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
                  {selected.payments.map((p) => {
                    const change = p.cashReceived ? Number(p.cashReceived) - Number(p.amount) : 0;
                    return (
                      <li key={p.id} className="flex items-center justify-between">
                        <span>
                          {new Date(p.createdAt).toLocaleString()} · {p.createdBy.name}
                          {p.cashReceived && (
                            <>
                              {" "}
                              (reçu {formatAmount(p.cashReceived)} Ar
                              {change > 0 ? `, rendu ${formatAmount(change)} Ar` : ""})
                            </>
                          )}
                        </span>
                        <span>{formatAmount(p.amount)} Ar</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {selected.paymentStatus !== "PAID" && !selected.cancelledAt && (
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
                {paymentAmountValue > 0 && (
                  <>
                    <Input
                      label="Montant reçu (espèces)"
                      type="number"
                      min={paymentAmountValue}
                      placeholder={String(paymentAmountValue)}
                      value={paymentCashReceived}
                      onChange={(e) => setPaymentCashReceived(e.target.value)}
                    />
                    {paymentChange > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Rendu à remettre : {formatAmount(paymentChange)} Ar
                      </p>
                    )}
                  </>
                )}
                <Button type="submit" className="w-full" disabled={paymentSaving}>
                  {paymentSaving ? "Enregistrement…" : "Enregistrer le paiement"}
                </Button>
              </form>
            )}

            {!selected.cancelledAt && (
              <form onSubmit={handleAddItem} className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Ajouter des produits (client déjà en caisse)
                </p>
                {addError && (
                  <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{addError}</p>
                )}
                <Select label="Produit" value={addOptionKey} onChange={(e) => setAddOptionKey(e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {addOptions.map((o) => (
                    <option key={o.key} value={o.key} disabled={o.maxQuantity <= 0}>
                      {o.productName} — {formatAmount(o.unitPrice)} Ar ({o.unitLabel}, stock: {o.maxQuantity})
                    </option>
                  ))}
                </Select>
                <Input
                  label="Quantité"
                  type="number"
                  min="1"
                  max={selectedAddOption?.maxQuantity}
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                />
                {selectedAddOption && (
                  <>
                    <div className="flex flex-col gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="addPaymentMode"
                          checked={addPaymentMode === "full"}
                          onChange={() => setAddPaymentMode("full")}
                        />
                        Payé intégralement ({formatAmount(addSubtotal)} Ar)
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="addPaymentMode"
                          checked={addPaymentMode === "partial"}
                          onChange={() => setAddPaymentMode("partial")}
                        />
                        Paiement partiel
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="addPaymentMode"
                          checked={addPaymentMode === "unpaid"}
                          onChange={() => setAddPaymentMode("unpaid")}
                        />
                        À crédit
                      </label>
                    </div>
                    {addPaymentMode === "partial" && (
                      <Input
                        label="Montant payé maintenant"
                        type="number"
                        min="0"
                        max={addSubtotal}
                        value={addPartialAmount}
                        onChange={(e) => setAddPartialAmount(e.target.value)}
                      />
                    )}
                    {addPaymentMode === "full" && (
                      <>
                        <Input
                          label="Montant reçu (espèces)"
                          type="number"
                          min={addSubtotal}
                          placeholder={String(addSubtotal)}
                          value={addCashReceived}
                          onChange={(e) => setAddCashReceived(e.target.value)}
                        />
                        {addChange > 0 && (
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Rendu à remettre : {formatAmount(addChange)} Ar
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
                <Button type="submit" className="w-full" disabled={addSaving || !selectedAddOption}>
                  {addSaving ? "Ajout…" : "Ajouter à la vente"}
                </Button>
              </form>
            )}

            {canManage && !selected.cancelledAt && (
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                {cancelError && (
                  <p className="mb-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{cancelError}</p>
                )}
                <Button type="button" variant="secondary" className="w-full" onClick={handleCancel} disabled={cancelSaving}>
                  {cancelSaving ? "Annulation…" : "Annuler cette vente"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
