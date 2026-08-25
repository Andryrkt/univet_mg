import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { ThemeToggle } from "../ui/ThemeToggle";
import type { Role } from "../../lib/types";

type NavItem = { to: string; label: string; roles?: Role[]; end?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Général",
    items: [{ to: "/", label: "Tableau de bord", end: true }],
  },
  {
    label: "Catalogue",
    items: [
      { to: "/produits", label: "Produits" },
      { to: "/categories", label: "Catégories", roles: ["ADMIN", "MODERATOR"] },
      { to: "/unites", label: "Unités", roles: ["ADMIN", "MODERATOR"] },
    ],
  },
  {
    label: "Achats",
    items: [
      { to: "/fournisseurs", label: "Fournisseurs", roles: ["ADMIN", "MODERATOR"] },
      { to: "/commandes", label: "Commandes fournisseurs", roles: ["ADMIN", "MODERATOR"] },
    ],
  },
  {
    label: "Stock",
    items: [
      { to: "/emplacements", label: "Emplacements", roles: ["ADMIN", "MODERATOR"] },
      { to: "/transferts-stock", label: "Transferts de stock", roles: ["ADMIN", "MODERATOR"] },
      { to: "/mouvements-stock", label: "Mouvements de stock", roles: ["ADMIN", "MODERATOR"] },
    ],
  },
  {
    label: "Ventes",
    items: [
      { to: "/ventes", label: "Point de vente" },
      { to: "/historique-ventes", label: "Historique des ventes" },
      { to: "/clients", label: "Clients" },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/utilisateurs", label: "Utilisateurs", roles: ["ADMIN"] },
      { to: "/parametres", label: "Paramètres", roles: ["ADMIN"] },
    ],
  },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    document.title = settings.name;
  }, [settings.name]);

  if (!user) return null;

  const groups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(user.role)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-4">
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{settings.name}</p>
          {settings.tagline && <p className="text-xs text-slate-500 dark:text-slate-400">{settings.tagline}</p>}
        </div>
        <nav className="flex flex-col gap-4 p-3">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{group.label}</p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `rounded-lg px-3 py-2 text-sm font-medium ${
                        isActive
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3">
          <div className="flex items-center gap-3 text-sm">
            <ThemeToggle />
            <span className="text-slate-600 dark:text-slate-400">
              {user.name} · <span className="font-medium">{user.role}</span>
            </span>
            <button onClick={() => logout()} className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400">
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
