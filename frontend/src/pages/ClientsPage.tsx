import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Client } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";

const emptyForm = { name: "", phone: "", email: "", address: "" };

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setClients(await api.get<Client[]>("/clients"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/clients", { ...form, email: form.email || null, address: form.address || null });
      setModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Clients</h1>
        <Button onClick={() => setModalOpen(true)}>+ Ajouter</Button>
      </div>

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Nom</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Téléphone</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Email</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Animaux</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  Aucun client
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2">
                    <Link to={`/clients/${c.id}`} className="font-medium text-slate-900 dark:text-slate-100 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{c.phone}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{c.email ?? "—"}</td>
                  <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">{c.animals.length}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau client">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nom" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="Téléphone"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Adresse"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
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
