import { useEffect } from "react";
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
} from "../ui/icons";
import type { Role } from "../../lib/types";

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
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                        isActive
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
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
