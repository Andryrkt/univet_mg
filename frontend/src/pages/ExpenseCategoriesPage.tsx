import { useAuth } from "../context/AuthContext";
import { SimpleCrudPage } from "../components/crud/SimpleCrudPage";
import type { ExpenseCategory } from "../lib/types";

export function ExpenseCategoriesPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "MODERATOR";

  return (
    <SimpleCrudPage<ExpenseCategory>
      title="Catégories de dépenses"
      endpoint="/expense-categories"
      canWrite={canWrite}
      fields={[{ name: "name", label: "Nom", required: true }]}
      columns={[{ key: "name", label: "Nom" }]}
    />
  );
}
