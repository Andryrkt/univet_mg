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

## Déploiement en production (Dokploy)

Fichiers dédiés à la production, séparés du setup de développement ci-dessus :

- [docker-compose.prod.yml](docker-compose.prod.yml) — pas de bind-mounts, images buildées, healthchecks, et un service `migrate` qui applique les migrations Prisma avant que le backend ne démarre.
- [backend/Dockerfile.prod](backend/Dockerfile.prod) — build multi-étapes, sortie `standalone` de Next.js, utilisateur non-root.
- [frontend/Dockerfile.prod](frontend/Dockerfile.prod) — build Vite statique servi par nginx ([frontend/nginx.conf](frontend/nginx.conf), fallback SPA vers `index.html`).
- [.env.production.example](.env.production.example) — modèle de variables commenté.
- `.env.production` (non versionné, généré localement avec des secrets forts prêts à l'emploi — voir la commande ci-dessous) : il ne reste qu'à y remplacer `votredomaine.mg` par votre vrai domaine avant de le coller dans les variables d'environnement de Dokploy.

  Pour regénérer des secrets à tout moment :
  ```bash
  openssl rand -base64 24   # POSTGRES_PASSWORD
  openssl rand -base64 48   # JWT_SECRET
  ```

Dokploy embarque déjà son propre reverse proxy (Traefik) avec HTTPS automatique (Let's Encrypt) : il n'y a donc pas de reverse proxy supplémentaire dans `docker-compose.prod.yml`. Les services `backend` et `frontend` n'exposent leurs ports qu'en interne (`expose`, pas `ports`) — c'est Dokploy qui les route depuis les domaines configurés dans son interface.

### Étapes

1. **DNS** : pointer deux sous-domaines vers le serveur Dokploy, ex. `app.votredomaine.mg` (frontend) et `api.votredomaine.mg` (backend). Un sous-domaine séparé pour l'API évite d'avoir à faire du routing par chemin, et fonctionne très bien avec les cookies de session (même domaine racine ⇒ `SameSite=Lax` suffit, pas besoin de `SameSite=None`).

2. **Créer une application "Docker Compose"** dans Dokploy, pointée sur ce dépôt et le fichier `docker-compose.prod.yml`.

3. **Variables d'environnement** : dans l'onglet Environment de Dokploy, renseigner toutes les valeurs de `.env.production.example`, avec :
   - `JWT_SECRET` et `POSTGRES_PASSWORD` générés via `openssl rand -base64 32` (ou équivalent) — jamais les valeurs par défaut du `.env` de dev.
   - `VITE_APP_ORIGIN=https://app.votredomaine.mg` (utilisé côté backend pour les en-têtes CORS)
   - `VITE_API_URL=https://api.votredomaine.mg` (**compilé en dur dans le bundle frontend au build** — le changer nécessite un rebuild de l'image frontend, pas seulement un redémarrage).

4. **Domaines** : dans la configuration du service `frontend`, assigner le domaine `app.votredomaine.mg` sur le port interne `80` ; sur le service `backend`, assigner `api.votredomaine.mg` sur le port interne `4000`. Activer le certificat HTTPS automatique pour les deux.

5. **Déployer**. Le service `migrate` s'exécute une fois, applique les migrations, puis `backend` démarre seulement s'il a réussi (`depends_on: condition: service_completed_successfully`).

6. **Peupler la base** (première fois uniquement) : depuis le terminal Dokploy (ou `docker compose -f docker-compose.prod.yml exec backend` si accès SSH direct au serveur), lancer le seed en utilisant l'image `migrate` (qui contient le CLI Prisma, contrairement à l'image `backend` allégée) :

   ```bash
   docker compose -f docker-compose.prod.yml run --rm migrate npx prisma db seed
   ```

### Mise à jour après un changement de schéma Prisma

Générer la migration en local comme décrit dans la section Développement, commiter le dossier `backend/prisma/migrations/`, puis redéployer — le service `migrate` l'appliquera automatiquement avant le redémarrage du backend.
