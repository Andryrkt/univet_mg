import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/RoleGuard";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductsPage } from "./pages/ProductsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { UnitsPage } from "./pages/UnitsPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { PurchaseOrdersPage } from "./pages/PurchaseOrdersPage";
import { PurchaseOrderDetailPage } from "./pages/PurchaseOrderDetailPage";
import { PurchaseOrderPrintPage } from "./pages/PurchaseOrderPrintPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { SalesPage } from "./pages/SalesPage";
import { SalesHistoryPage } from "./pages/SalesHistoryPage";
import { StockMovementsPage } from "./pages/StockMovementsPage";
import { UsersPage } from "./pages/UsersPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/commandes/:id/imprimer"
        element={
          <ProtectedRoute roles={["ADMIN", "MODERATOR"]}>
            <PurchaseOrderPrintPage />
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/produits" element={<ProductsPage />} />
        <Route
          path="/categories"
          element={
            <ProtectedRoute roles={["ADMIN", "MODERATOR"]}>
              <CategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/unites"
          element={
            <ProtectedRoute roles={["ADMIN", "MODERATOR"]}>
              <UnitsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fournisseurs"
          element={
            <ProtectedRoute roles={["ADMIN", "MODERATOR"]}>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/commandes"
          element={
            <ProtectedRoute roles={["ADMIN", "MODERATOR"]}>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/commandes/:id"
          element={
            <ProtectedRoute roles={["ADMIN", "MODERATOR"]}>
              <PurchaseOrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/ventes" element={<SalesPage />} />
        <Route path="/historique-ventes" element={<SalesHistoryPage />} />
        <Route
          path="/mouvements-stock"
          element={
            <ProtectedRoute roles={["ADMIN", "MODERATOR"]}>
              <StockMovementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/utilisateurs"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
