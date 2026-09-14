import type { Role } from "./types";

export type TourStep = {
  target: string;
  title: string;
  text: string;
  roles?: Role[];
};

export const tourSteps: TourStep[] = [
  {
    target: "sidebar",
    title: "Bienvenue !",
    text: "Voici le menu principal : il regroupe toutes les fonctionnalités par catégorie (Catalogue, Achats, Stock, Ventes, Dépenses...).",
  },
  {
    target: "nav-/",
    title: "Tableau de bord",
    text: "Vue d'ensemble : alertes de stock, produits qui périment bientôt, produits peu vendus, etc.",
  },
  {
    target: "nav-/produits",
    title: "Produits",
    text: "Gérez vos produits, leurs prix, et ajustez le stock à tout moment.",
  },
  {
    target: "nav-/ventes",
    title: "Point de vente",
    text: "C'est ici que se font les ventes : ajoutez des produits au panier, choisissez le client et le mode de paiement.",
  },
  {
    target: "nav-/caisse",
    title: "Caisse",
    text: "Déclarez le fond de caisse en début de service, et clôturez-la en fin de service.",
  },
  {
    target: "nav-/utilisateurs",
    title: "Utilisateurs",
    text: "En tant qu'Admin, gérez les comptes et les rôles (Admin, Modérateur, Vendeur) de votre équipe ici.",
    roles: ["ADMIN"],
  },
  {
    target: "nav-/aide",
    title: "Besoin d'aide ?",
    text: "La page Aide détaille chaque tâche courante pas à pas. Vous pourrez aussi y rejouer cette visite à tout moment.",
  },
  {
    target: "header-user",
    title: "Votre profil",
    text: "Votre nom et votre rôle sont affichés ici, avec le bouton pour vous déconnecter.",
  },
];
