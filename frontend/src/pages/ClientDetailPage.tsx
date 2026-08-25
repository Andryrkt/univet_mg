import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { ClientDetail } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";

const emptyForm = { name: "", species: "", breed: "", notes: "" };

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load(showSpinner: boolean) {
    if (!id) return;
    if (showSpinner) setLoading(true);
    try {
      setClient(await api.get<ClientDetail>(`/clients/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/clients/${id}/animals`, { ...form, breed: form.breed || null, notes: form.notes || null });
      setModalOpen(false);
      setForm(emptyForm);
      await load(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400">Chargement…</p>;
  if (!client) return <p className="text-red-600">Client introuvable</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{client.name}</h1>
        <p className="text-sm text-slate-500">
          {client.phone}
          {client.email ? ` · ${client.email}` : ""}
          {client.address ? ` · ${client.address}` : ""}
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Animaux</h2>
          <Button onClick={() => setModalOpen(true)}>+ Ajouter un animal</Button>
        </div>
        {client.animals.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun animal enregistré.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {client.animals.map((a) => (
              <li key={a.id} className="py-2 text-sm">
                <span className="font-medium text-slate-800">{a.name}</span>
                <span className="text-slate-500">
                  {" "}
                  — {a.species}
                  {a.breed ? ` (${a.breed})` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-slate-900">Historique des achats</h2>
        {client.sales.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun achat enregistré.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {client.sales.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700">{new Date(s.createdAt).toLocaleString()}</span>
                <span className="font-medium text-slate-900">{Number(s.totalAmount).toFixed(2)} Ar</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel animal">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nom" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="Espèce"
            required
            value={form.species}
            onChange={(e) => setForm({ ...form, species: e.target.value })}
          />
          <Input label="Race" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
