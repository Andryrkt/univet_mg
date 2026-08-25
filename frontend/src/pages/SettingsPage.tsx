import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { useSettings } from "../context/SettingsContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

const emptyForm = { name: "", tagline: "", address: "", phone: "", email: "" };

export function SettingsPage() {
  const { settings, refresh } = useSettings();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setForm({
      name: settings.name,
      tagline: settings.tagline ?? "",
      address: settings.address ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
    });
  }, [settings]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.patch("/settings", {
        name: form.name,
        tagline: form.tagline || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
      });
      await refresh();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Paramètres du cabinet</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Ces informations apparaissent dans l'interface (barre latérale, page de connexion) et sur les documents
        imprimés (bons de commande et de réception).
      </p>

      {error && <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {success && <p className="rounded-lg bg-green-50 dark:bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">Paramètres enregistrés.</p>}

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <Input label="Nom du cabinet" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input
          label="Sous-titre"
          value={form.tagline}
          onChange={(e) => setForm({ ...form, tagline: e.target.value })}
        />
        <Input
          label="Adresse"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <Input label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
