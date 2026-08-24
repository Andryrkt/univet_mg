import { useAuth } from "../context/AuthContext";
import { SimpleCrudPage } from "../components/crud/SimpleCrudPage";
import type { Supplier } from "../lib/types";

export function SuppliersPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "MODERATOR";

  return (
    <SimpleCrudPage<Supplier>
      title="Fournisseurs"
      endpoint="/suppliers"
      canWrite={canWrite}
      fields={[
        { name: "name", label: "Nom", required: true },
        { name: "contactName", label: "Contact" },
        { name: "phone", label: "Téléphone" },
        { name: "email", label: "Email" },
        { name: "address", label: "Adresse" },
      ]}
      columns={[
        { key: "name", label: "Nom" },
        { key: "contactName", label: "Contact" },
        { key: "phone", label: "Téléphone" },
        { key: "email", label: "Email" },
      ]}
    />
  );
}
