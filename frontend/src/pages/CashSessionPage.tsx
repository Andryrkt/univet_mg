import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { CashSession, Location } from "../lib/types";
import { Button } from "../components/ui/Button";
import { AmountInput } from "../components/ui/AmountInput";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { formatAmount } from "../lib/format";

export function CashSessionPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openingAmount, setOpeningAmount] = useState("");
  const [opening, setOpening] = useState(false);

  const [countedAmount, setCountedAmount] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [closing, setClosing] = useState(false);

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    try {
      const [l, s] = await Promise.all([api.get<Location[]>("/locations"), api.get<CashSession[]>("/cash-sessions")]);
      const activeLocations = l.filter((loc) => loc.isActive);
      setLocations(activeLocations);
      setSessions(s);
      setLocationId((prev) => prev || activeLocations[0]?.id || "");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  const openSession = sessions.find((s) => s.locationId === locationId && !s.closedAt);
  const history = sessions.filter((s) => s.locationId === locationId && s.closedAt);

  async function handleOpen(e: FormEvent) {
    e.preventDefault();
    setOpening(true);
    setError(null);
    try {
      await api.post("/cash-sessions", { locationId, openingAmount: Number(openingAmount) || 0 });
      setOpeningAmount("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'ouverture de la caisse");
    } finally {
      setOpening(false);
    }
  }

  async function handleClose(e: FormEvent) {
    e.preventDefault();
    if (!openSession) return;
    setClosing(true);
    setError(null);
    try {
      await api.post(`/cash-sessions/${openSession.id}/close`, {
        countedAmount: Number(countedAmount) || 0,
        note: closeNote || null,
      });
      setCountedAmount("");
      setCloseNote("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la clôture de la caisse");
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Caisse</h1>

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <Select label="Emplacement" required value={locationId} onChange={(e) => setLocationId(e.target.value)}>
        <option value="">Sélectionner…</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </Select>

      {locationId && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          {!openSession ? (
            <form onSubmit={handleOpen} className="space-y-3">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Ouvrir la caisse</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Aucune session ouverte pour cet emplacement.</p>
              <AmountInput
                label="Fond de caisse (montant d'ouverture)"
                required
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
              />
              <Button type="submit" disabled={opening}>
                {opening ? "Ouverture…" : "Ouvrir la caisse"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleClose} className="space-y-3">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Caisse ouverte</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ouverte le {new Date(openSession.openedAt).toLocaleString()} par {openSession.openedBy.name} —
                fond de {formatAmount(openSession.openingAmount)} Ar
              </p>
              <AmountInput
                label="Montant compté à la clôture"
                required
                value={countedAmount}
                onChange={(e) => setCountedAmount(e.target.value)}
              />
              <Input
                label="Note (optionnel)"
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
              />
              <Button type="submit" disabled={closing}>
                {closing ? "Clôture…" : "Clôturer la caisse"}
              </Button>
            </form>
          )}
        </div>
      )}

      {locationId && history.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Ouverte le</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Fermée le</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Ouverture</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Attendu</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Compté</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Écart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((s) => {
                const diff = Number(s.difference ?? 0);
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{new Date(s.openedAt).toLocaleString()}</td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                      {s.closedAt && new Date(s.closedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{formatAmount(s.openingAmount)}</td>
                    <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                      {s.expectedAmount !== null ? formatAmount(s.expectedAmount) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                      {s.countedAmount !== null ? formatAmount(s.countedAmount) : "—"}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-medium ${
                        diff === 0 ? "text-slate-500 dark:text-slate-400" : diff > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {diff > 0 ? "+" : ""}
                      {formatAmount(diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
