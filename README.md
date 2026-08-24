# Univet MG

Application de gestion de stock et de ventes pour un cabinet vétérinaire.

- **Base de données** : PostgreSQL
- **Backend** : Next.js (API routes uniquement, JWT en cookie httpOnly, Prisma) — [backend/](backend/)
- **Frontend** : React + Vite + TypeScript + Tailwind CSS — [frontend/](frontend/)
- **Orchestration** : Docker Compose

Gère les produits, catégories, unités, fournisseurs, commandes fournisseurs (avec réception de stock), clients et leurs animaux, ventes (point de vente), et le journal des mouvements de stock. Trois rôles utilisateurs : **Admin**, **Modérateur**, **Vendeur** (voir la matrice de permissions dans le code, `backend/src/lib/api-helpers.ts` + chaque route).

## Démarrage

1. Copier le fichier d'environnement et ajuster les valeurs si besoin :

   ```bash
   cp .env.example .env
   ```

2. Lancer l'ensemble des services :

   ```bash
   docker compose up --build
   ```

3. Appliquer le schéma à la base de données (première fois) :

   ```bash
   docker compose exec backend npx prisma migrate deploy
   ```

   > `prisma migrate dev` nécessite un terminal interactif et ne fonctionne pas via `docker compose exec` sans TTY. Pour créer une **nouvelle** migration après une modification du schéma, générez-la avec `prisma migrate diff` puis appliquez-la avec `migrate deploy` (voir section Développement), ou lancez `migrate dev` directement dans un terminal attaché au conteneur.

4. Peupler la base avec le compte admin et des données d'exemple :

   ```bash
   docker compose exec backend npx prisma db seed
   ```

## Compte de démarrage

`admin@univet.mg` / `Admin123!` (à changer après la première connexion, page **Utilisateurs**). Personnalisable via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` dans `.env` avant le premier seed.

## Données d'exemple

Le seed ([backend/prisma/seed.ts](backend/prisma/seed.ts)) crée, si la base est vide : 4 unités, 4 catégories, 3 fournisseurs, 8 produits, 3 commandes fournisseurs déjà réceptionnées (stock initial), 4 clients avec leurs animaux, et une vente d'exemple. Il est idempotent : relancer `prisma db seed` ne duplique rien tant que des unités existent déjà (le compte admin, lui, est recréé uniquement s'il n'existe pas).

## Services

| Service    | URL                              | Description                          |
|------------|-----------------------------------|---------------------------------------|
| frontend   | http://localhost:5173            | Interface React/Tailwind             |
| backend    | http://localhost:4000/api/health | API Next.js (santé + connexion DB)   |
| postgres   | localhost:5432                   | Base de données PostgreSQL           |

## Développement

Les dossiers `backend/` et `frontend/` sont montés en volume dans les conteneurs : les modifications de code sont prises en compte à chaud (hot reload) sans reconstruire les images.

- Nouvelle dépendance ajoutée à un `package.json` : relancer `docker compose up --build`, puis supprimer le volume `node_modules` correspondant (`docker compose down` puis `docker volume rm univet_mg_backend_node_modules` ou `univet_mg_frontend_node_modules`) si les nouveaux paquets ne sont pas détectés — les volumes nommés persistent d'un build à l'autre et peuvent masquer les dépendances fraîchement installées dans l'image.
- Modification du schéma Prisma ([backend/prisma/schema.prisma](backend/prisma/schema.prisma)) : générer la migration de façon non-interactive puis l'appliquer :

  ```bash
  TS=$(date -u +%Y%m%d%H%M%S)
  mkdir -p "backend/prisma/migrations/${TS}_change"
  docker compose exec backend sh -c "npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/${TS}_change/migration.sql"
  docker compose exec backend npx prisma migrate deploy
  ```

  (le dossier de la migration doit être créé côté hôte avant la redirection, sans quoi le conteneur ne peut pas y écrire)

## Arrêt

```bash
docker compose down
```

Pour supprimer aussi les données PostgreSQL persistées :

```bash
docker compose down -v
```