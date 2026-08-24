import { useAuth } from "../context/AuthContext";
import { SimpleCrudPage } from "../components/crud/SimpleCrudPage";
import type { Category } from "../lib/types";

export function CategoriesPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "MODERATOR";

  return (
    <SimpleCrudPage<Category>
      title="Catégories"
      endpoint="/categories"
      canWrite={canWrite}
      fields={[
        { name: "name", label: "Nom", required: true },
        { name: "description", label: "Description" },
      ]}
      columns={[
        { key: "name", label: "Nom" },
        { key: "description", label: "Description" },
      ]}
    />
  );
}
