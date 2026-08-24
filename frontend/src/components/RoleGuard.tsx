import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../lib/types";

type ProtectedRouteProps = {
  children: ReactNode;
  roles?: Role[];
};

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Chargement…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-6">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Accès refusé : vous n'avez pas les droits nécessaires pour accéder à cette page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
