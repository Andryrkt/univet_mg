import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { ClinicSettings } from "../lib/types";

const defaultSettings: ClinicSettings = {
  id: "singleton",
  name: "Univet MG",
  tagline: "Cabinet vétérinaire — Gestion de stock & ventes",
  address: null,
  phone: null,
  email: null,
  expiryAlertDays: 90,
  slowMovingDays: 30,
  updatedAt: "",
};

type SettingsContextValue = {
  settings: ClinicSettings;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ClinicSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const data = await api.get<ClinicSettings>("/settings");
      setSettings(data);
    } catch {
      // Garde les valeurs par défaut si l'API est injoignable.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SettingsContext.Provider value={{ settings, loading, refresh }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings doit être utilisé dans un SettingsProvider");
  return ctx;
}
