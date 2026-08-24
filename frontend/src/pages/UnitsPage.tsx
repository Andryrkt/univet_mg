import { useAuth } from "../context/AuthContext";
import { SimpleCrudPage } from "../components/crud/SimpleCrudPage";
import type { Unit } from "../lib/types";

export function UnitsPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "MODERATOR";

  return (
    <SimpleCrudPage<Unit>
      title="Unités"
      endpoint="/units"
      canWrite={canWrite}
      fields={[
        { name: "name", label: "Nom", required: true },
        { name: "symbol", label: "Symbole" },
      ]}
      columns={[
        { key: "name", label: "Nom" },
        { key: "symbol", label: "Symbole" },
      ]}
    />
  );
}
