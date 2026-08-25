import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import type { Role } from "../../lib/types";

type NavItem = { to: string; label: string; roles?: Role[]; end?: boolean };

const navItems: NavItem[] = [
  { to: "/", label: "Tableau de bord", end: true },
  { to: "/produits", label: "Produits" },
  { to: "/categories", label: "Catégories", roles: ["ADMIN", "MODERATOR"] },
  { to: "/unites", label: "Unités", roles: ["ADMIN", "MODERATOR"] },
  { to: "/fournisseurs", label: "Fournisseurs", roles: ["ADMIN", "MODERATOR"] },
  { to: "/commandes", label: "Commandes fournisseurs", roles: ["ADMIN", "MODERATOR"] },
  { to: "/clients", label: "Clients" },
  { to: "/ventes", label: "Point de vente" },
  { to: "/historique-ventes", label: "Historique des ventes" },
  { to: "/mouvements-stock", label: "Mouvements de stock", roles: ["ADMIN", "MODERATOR"] },
  { to: "/emplacements", label: "Emplacements", roles: ["ADMIN", "MODERATOR"] },
  { to: "/transferts-stock", label: "Transferts de stock", roles: ["ADMIN", "MODERATOR"] },
  { to: "/utilisateurs", label: "Utilisateurs", roles: ["ADMIN"] },
  { to: "/parametres", label: "Paramètres", roles: ["ADMIN"] },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    document.title = settings.name;
  }, [settings.name]);

  if (!user) return null;

  const items = navItems.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-lg font-bold text-slate-900">{settings.name}</p>
          {settings.tagline && <p className="text-xs text-slate-500">{settings.tagline}</p>}
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {user.name} · <span className="font-medium">{user.role}</span>
            </span>
            <button onClick={() => logout()} className="text-slate-400 hover:text-red-600">
              Déconnexion
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
