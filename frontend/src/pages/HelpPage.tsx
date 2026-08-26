import { useState } from "react";
import { ChevronRightIcon } from "../components/ui/icons";

type Section = { id: string; title: string; content: string[] };

const sections: Section[] = [
  {
    id: "vente",
    title: "Faire une vente (point de vente)",
    content: [
      "Allez dans « Point de vente », choisissez l'emplacement puis ajoutez les produits au panier (cherchez par nom, l'unité de vente — pièce, boîte… — est indiquée entre parenthèses).",
      "Choisissez le client. S'il n'existe pas encore, cliquez sur « + Nouveau client » sans quitter la vente.",
      "Choisissez comment le client paie : Payé intégralement, Paiement partiel (le reste reste dû), ou à crédit s'il n'a pas de quoi payer maintenant.",
      "En paiement intégral en espèces, indiquez le montant reçu si le client vous donne plus que le total : le rendu à remettre s'affiche automatiquement.",
      "Cliquez sur « Valider la vente ». Vous êtes redirigé vers l'historique où vous pouvez imprimer la facture ou le ticket de caisse.",
    ],
  },
  {
    id: "impayes",
    title: "Gérer les impayés et les ventes à crédit",
    content: [
      "Dans « Historique des ventes », les ventes non entièrement payées affichent un badge Partiel ou Impayé.",
      "Cliquez sur la vente pour l'ouvrir : un formulaire « Enregistrer un paiement » permet d'ajouter l'argent reçu quand le client revient payer, avec le mode de paiement (espèces ou autre).",
      "Le même écran permet d'ajouter des produits à une vente déjà validée si le client en veut d'autres pendant qu'il est encore au comptoir.",
    ],
  },
  {
    id: "annulation",
    title: "Annuler une vente",
    content: [
      "Réservé aux Admins et Modérateurs. Dans le détail d'une vente (Historique des ventes), cliquez sur « Annuler cette vente ».",
      "Le stock vendu est automatiquement remis en stock. Si de l'argent avait déjà été encaissé, un rappel s'affiche pour penser au remboursement.",
    ],
  },
  {
    id: "stock",
    title: "Gérer le stock d'un produit",
    content: [
      "Dans « Produits », le bouton « Ajuster stock » permet de corriger une quantité (positive pour ajouter, négative pour retirer), avec un motif optionnel.",
      "Si vous ajoutez du stock, vous pouvez indiquer une date de péremption : elle sera suivie automatiquement (voir « Suivi des lots et péremptions » ci-dessous).",
      "Le seuil d'alerte stock (dans la fiche produit) déclenche une alerte sur le tableau de bord quand le stock passe en dessous.",
    ],
  },
  {
    id: "commandes",
    title: "Réceptionner une commande fournisseur",
    content: [
      "Dans « Commandes fournisseurs », créez une commande puis ouvrez-la pour la réceptionner (en une ou plusieurs fois si la livraison est partielle).",
      "Indiquez la date de péremption de chaque produit reçu si elle est connue : elle permet de suivre les produits qui périment bientôt.",
      "Une commande peut être clôturée si le solde restant ne sera jamais livré, sans perdre ce qui a déjà été reçu.",
    ],
  },
  {
    id: "transferts",
    title: "Transférer du stock entre emplacements",
    content: [
      "Dans « Transferts de stock », choisissez le produit, la quantité, l'emplacement source et destination.",
      "La date de péremption du lot transféré est automatiquement conservée à l'arrivée.",
    ],
  },
  {
    id: "peremption",
    title: "Suivi des lots et des péremptions",
    content: [
      "Le tableau de bord affiche « Produits qui périment bientôt » : la fenêtre d'alerte (nombre de jours avant échéance) se règle dans Paramètres.",
      "Le tableau de bord affiche aussi « Produits peu vendus » : les produits actifs sans aucune vente depuis un certain nombre de jours (réglable dans Paramètres).",
    ],
  },
  {
    id: "caisse",
    title: "Ouvrir et clôturer la caisse (fond de caisse)",
    content: [
      "Dans « Caisse », choisissez l'emplacement puis déclarez le fond de caisse (montant de départ) en début de service.",
      "En fin de service, comptez l'argent réellement présent et saisissez-le dans « Montant compté à la clôture ». L'application calcule automatiquement le montant théorique (fond de départ + ventes en espèces) et l'écart.",
      "Seuls les paiements en espèces comptent dans ce calcul — un paiement par Mvola, carte, etc. n'affecte pas la caisse.",
    ],
  },
  {
    id: "clients",
    title: "Gérer les clients et leurs animaux",
    content: [
      "Dans « Clients », créez une fiche avec au moins un nom et un téléphone. Ouvrez la fiche pour ajouter ses animaux (espèce, race, date de naissance, notes).",
    ],
  },
  {
    id: "roles",
    title: "Rôles et permissions",
    content: [
      "Admin : accès complet, y compris utilisateurs et paramètres du cabinet.",
      "Modérateur : gère le catalogue, les commandes fournisseurs, le stock et les ventes, mais pas les utilisateurs ni les paramètres.",
      "Vendeur : se concentre sur les ventes, les clients et la caisse ; lecture seule sur le catalogue.",
    ],
  },
];

export function HelpPage() {
  const [open, setOpen] = useState<Record<string, boolean>>({ vente: true });

  function toggle(id: string) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Aide</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Guide rapide des tâches courantes dans l'application.
        </p>
      </div>

      <div className="space-y-2">
        {sections.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => toggle(s.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-medium text-slate-900 dark:text-slate-100">{s.title}</span>
              <ChevronRightIcon
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open[s.id] ? "rotate-90" : ""}`}
              />
            </button>
            {open[s.id] && (
              <ul className="space-y-2 border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                {s.content.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
