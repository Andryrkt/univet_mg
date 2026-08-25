import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { Location } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";

const emptyForm = { name: "", address: "", phone: "" };

export function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLocations(await api.get<Location[]>("/locations"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(location: Location) {
    setEditing(location);
    setForm({ name: location.name, address: location.address ?? "", phone: location.phone ?? "" });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = { name: form.name, address: form.address || null, phone: form.phone || null };
    try {
      if (editing) {
        await api.patch(`/locations/${editing.id}`, { ...payload, isActive: editing.isActive });
      } else {
        await api.post("/locations", payload);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(location: Location) {
    setError(null);
    try {
      await api.patch(`/locations/${location.id}`, {
        name: location.name,
        address: location.address,
        phone: location.phone,
        isActive: !location.isActive,
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur");
    }
  }

  if (loading) return <p className="text-slate-400">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Emplacements</h1>
        <Button onClick={openCreate}>+ Ajouter</Button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Nom</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Adresse</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Téléphone</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Statut</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {locations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Aucun emplacement
                </td>
              </tr>
            ) : (
              locations.map((l) => (
                <tr key={l.id} className={!l.isActive ? "opacity-40" : ""}>
                  <td className="px-4 py-2 font-medium text-slate-800">{l.name}</td>
                  <td className="px-4 py-2 text-slate-700">{l.address ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-700">{l.phone ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-700">{l.isActive ? "Actif" : "Désactivé"}</td>
                  <td className="space-x-2 px-4 py-2 text-right">
                    <button onClick={() => openEdit(l)} className="text-sm text-slate-500 hover:text-slate-900">
                      Modifier
                    </button>
                    <button onClick={() => toggleActive(l)} className="text-sm text-red-500 hover:text-red-700">
                      {l.isActive ? "Désactiver" : "Réactiver"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Modifier l'emplacement" : "Nouvel emplacement"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nom" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="Adresse"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
