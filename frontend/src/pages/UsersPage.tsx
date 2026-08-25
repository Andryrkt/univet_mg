import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { User } from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { PlusIcon } from "../components/ui/icons";

const emptyForm = { email: "", password: "", name: "", role: "SELLER" };

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setUsers(await api.get<User[]>("/users"));
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
      await api.post("/users", form);
      setModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: User) {
    setError(null);
    try {
      await api.patch(`/users/${user.id}`, { isActive: !user.isActive, name: user.name, role: user.role });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur");
    }
  }

  if (loading) return <p className="text-slate-400 dark:text-slate-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Utilisateurs</h1>
        <Button onClick={() => setModalOpen(true)}>
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Nom</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Email</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Rôle</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Statut</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className={!u.isActive ? "opacity-40" : ""}>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{u.name}</td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{u.email}</td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{u.role}</td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{u.isActive ? "Actif" : "Désactivé"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => toggleActive(u)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                    {u.isActive ? "Désactiver" : "Réactiver"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel utilisateur">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nom" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Mot de passe"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Select label="Rôle" required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="ADMIN">Admin</option>
            <option value="MODERATOR">Modérateur</option>
            <option value="SELLER">Vendeur</option>
          </Select>
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
