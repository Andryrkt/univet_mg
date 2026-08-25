import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { ThemeToggle } from "../ui/ThemeToggle";
import {
  HomeIcon,
  BoxIcon,
  TagIcon,
  ScaleIcon,
  TruckIcon,
  ClipboardListIcon,
  MapPinIcon,
  TransferIcon,
  ChartBarIcon,
  CartIcon,
  ClockIcon,
  UsersIcon,
  UserCogIcon,
  SettingsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../ui/icons";
import type { Role } from "../../lib/types";

const SIDEBAR_STORAGE_KEY = "univet-sidebar-collapsed";

type IconComponent = (props: { className?: string }) => JSX.Element;
type NavItem = { to: string; label: string; icon: IconComponent; roles?: Role[]; end?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Général",
    items: [{ to: "/", label: "Tableau de bord", icon: HomeIcon, end: true }],
  },
  {
    label: "Catalogue",
    items: [
      { to: "/produits", label: "Produits", icon: BoxIcon },
      { to: "/categories", label: "Catégories", icon: TagIcon, roles: ["ADMIN", "MODERATOR"] },
      { to: "/unites", label: "Unités", icon: ScaleIcon, roles: ["ADMIN", "MODERATOR"] },
    ],
  },
  {
    label: "Achats",
    items: [
      { to: "/fournisseurs", label: "Fournisseurs", icon: TruckIcon, roles: ["ADMIN", "MODERATOR"] },
      { to: "/commandes", label: "Commandes fournisseurs", icon: ClipboardListIcon, roles: ["ADMIN", "MODERATOR"] },
    ],
  },
  {
    label: "Stock",
    items: [
      { to: "/emplacements", label: "Emplacements", icon: MapPinIcon, roles: ["ADMIN", "MODERATOR"] },
      { to: "/transferts-stock", label: "Transferts de stock", icon: TransferIcon, roles: ["ADMIN", "MODERATOR"] },
      { to: "/mouvements-stock", label: "Mouvements de stock", icon: ChartBarIcon, roles: ["ADMIN", "MODERATOR"] },
    ],
  },
  {
    label: "Ventes",
    items: [
      { to: "/ventes", label: "Point de vente", icon: CartIcon },
      { to: "/historique-ventes", label: "Historique des ventes", icon: ClockIcon },
      { to: "/clients", label: "Clients", icon: UsersIcon },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/utilisateurs", label: "Utilisateurs", icon: UserCogIcon, roles: ["ADMIN"] },
      { to: "/parametres", label: "Paramètres", icon: SettingsIcon, roles: ["ADMIN"] },
    ],
  },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");

  useEffect(() => {
    document.title = settings.name;
  }, [settings.name]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  if (!user) return null;

  const groups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(user.role)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside
        className={`shrink-0 overflow-y-auto border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-[width] duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-3 py-4">
          {!collapsed && (
            <div className="min-w-0 px-1">
              <p className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">{settings.name}</p>
              {settings.tagline && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{settings.tagline}</p>
              )}
            </div>
          )}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
            title={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
            className={`shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${
              collapsed ? "mx-auto" : ""
            }`}
          >
            {collapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
          </button>
        </div>
        <nav className="flex flex-col gap-4 p-3">
          {groups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                        collapsed ? "justify-center" : ""
                      } ${
                        isActive
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && item.label}
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
