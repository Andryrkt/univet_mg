# Gestion de stock & ventes — Cabinet vétérinaire

## Contexte

Le scaffold actuel (Next.js API + React/Vite/Tailwind + PostgreSQL, orchestrés par Docker Compose) ne contient qu'un exemple `User`/`health`. L'objectif réel : une application de gestion de stock et de ventes pour un cabinet vétérinaire, avec des rôles utilisateurs (Admin, Modérateur, Vendeur) qui contrôlent qui peut gérer les produits, fournisseurs, unités, catégories, commandes fournisseurs, clients/animaux et ventes.

Décisions déjà validées avec l'utilisateur :
- 3 rôles : **ADMIN**, **MODERATOR**, **SELLER**.
- Les ventes sont rattachées à un **client enregistré** (avec ses animaux), pas de vente 100% anonyme.
- La réception de stock passe par un **bon de commande fournisseur** complet (statuts commandé → reçu / annulé), pas un simple ajustement.

Le modèle `User` existant (email/name, sans mot de passe ni rôle) et la migration Prisma actuelle seront remplacés — aucune donnée réelle n'existe encore (juste une ligne de test déjà supprimée), donc on repart d'une migration Prisma propre.

## Modèle de données (`backend/prisma/schema.prisma`)

- **User** : id, email (unique), passwordHash, name, role (`ADMIN`\|`MODERATOR`\|`SELLER`), isActive, createdAt/updatedAt.
- **Unit** : id, name, symbol?, createdAt.
- **Category** : id, name, description?, createdAt.
- **Supplier** : id, name, contactName?, phone?, email?, address?, createdAt.
- **Product** : id, name, sku? (unique), categoryId, unitId, purchasePrice (Decimal 10,2), sellingPrice (Decimal 10,2), stockQuantity (Int, défaut 0 — champ dénormalisé maintenu par les mouvements de stock), alertThreshold (Int, défaut 0), isActive, createdAt/updatedAt.
- **Client** (propriétaire) : id, name, phone, email?, address?, createdAt.
- **Animal** : id, clientId, name, species, breed?, birthDate?, notes?, createdAt.
- **PurchaseOrder** : id, supplierId, status (`PENDING`\|`RECEIVED`\|`CANCELLED`), orderDate, createdById, receivedAt?, createdAt.
- **PurchaseOrderItem** : id, purchaseOrderId, productId, quantityOrdered, quantityReceived?, unitPrice (Decimal).
- **Sale** : id, clientId, sellerId (User), totalAmount (Decimal), createdAt.
- **SaleItem** : id, saleId, productId, quantity, unitPrice (Decimal), subtotal (Decimal).
- **StockMovement** (journal d'audit) : id, productId, type (`PURCHASE_RECEPTION`\|`SALE`\|`ADJUSTMENT`), quantity (signé : + entrée / - sortie), referenceType/referenceId (commande ou vente d'origine), note?, createdById, createdAt.

Toutes les écritures qui touchent le stock (réception de commande, vente, ajustement manuel) se font dans une transaction Prisma (`prisma.$transaction`) qui met à jour `Product.stockQuantity` **et** insère la `StockMovement` correspondante, pour garder les deux cohérents.

## Authentification & autorisation

- JWT signé (lib `jose`, compatible Edge/Alpine sans dépendances natives), stocké dans un **cookie httpOnly** (`session`), vérifié dans un helper `backend/src/lib/auth.ts` (`getAuthUser(request)`, `requireRole(user, [...roles])`).
- Mots de passe hashés avec `bcryptjs` (pur JS, évite les soucis de compilation native sous Alpine déjà rencontrés avec Prisma).
- Pas d'auto-inscription : les comptes Modérateur/Vendeur sont créés par un Admin. Un script de seed (`backend/prisma/seed.ts`) crée le premier compte Admin (identifiants via variables d'env `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, valeurs par défaut documentées dans le README).
- CORS déjà configuré (`next.config.mjs`) sera étendu avec `Access-Control-Allow-Credentials: true` pour que les cookies passent entre `localhost:5173` et `localhost:4000` (même registrable domain en dev, donc compatible `SameSite=Lax`).

Matrice de permissions (appliquée dans chaque route handler) :

| Ressource | ADMIN | MODERATOR | SELLER |
|---|---|---|---|
| Utilisateurs | CRUD | — | — |
| Unités / Catégories / Fournisseurs / Produits | CRUD | CRUD | Lecture |
| Commandes fournisseurs (+réception) | CRUD | CRUD | — |
| Clients / Animaux | CRUD | CRUD | Créer + Lire |
| Ventes | Créer + Lire | Créer + Lire | Créer + Lire |
| Mouvements de stock (journal) | Lire | Lire | — |

## API backend (`backend/src/app/api/**/route.ts`)

- `auth/login`, `auth/logout`, `auth/me`
- `users`, `users/[id]` (ADMIN)
- `units`, `units/[id]` — `categories`, `categories/[id]` — `suppliers`, `suppliers/[id]` (lecture: tous ; écriture: ADMIN/MODERATOR)
- `products`, `products/[id]` (lecture: tous ; écriture: ADMIN/MODERATOR)
- `clients`, `clients/[id]`, `clients/[id]/animals`, `animals/[id]`
- `purchase-orders`, `purchase-orders/[id]`, `purchase-orders/[id]/receive` (POST → transaction stock)
- `sales`, `sales/[id]` (POST → transaction stock, vérifie stock suffisant avant de valider)
- `stock-movements` (lecture seule, filtrable par produit)

La route `api/users` (démo) et le modèle `User` actuel sont remplacés ; `api/health` est conservé tel quel.

## Frontend (`frontend/src`)

Nouvelle dépendance : `react-router-dom` (SPA multi-pages).

Structure :
- `lib/api.ts` — wrapper `fetch` (JSON, `credentials: "include"`, gestion d'erreurs).
- `context/AuthContext.tsx` — utilisateur courant, `login`/`logout`, helpers de rôle.
- `components/layout/` — shell avec sidebar dont les entrées de menu dépendent du rôle.
- `components/ui/` — `Button`, `Input`, `Select`, `Modal`, `Table` réutilisés par toutes les pages CRUD (même pattern : tableau + modale de formulaire).
- `components/RoleGuard.tsx` / route protégée — redirige vers `/login` si non authentifié, 403 si rôle insuffisant.

Pages :
`/login`, `/` (dashboard : alertes de stock bas, stats rapides), `/produits`, `/categories`, `/unites`, `/fournisseurs`, `/commandes` (liste + création + détail/réception), `/clients` (liste + fiche avec animaux), `/ventes` (point de vente), `/historique-ventes`, `/mouvements-stock`, `/utilisateurs` (ADMIN).

`App.tsx` actuel (démo `/api/health`) est remplacé par le routeur + `AuthProvider`.

## Migration & seed

1. Réécrire `backend/prisma/schema.prisma` avec le modèle complet.
2. Supprimer la migration existante `20260824105748_init` (données jetables) et regénérer via `prisma migrate dev --name init` une fois les conteneurs relancés.
3. Ajouter `backend/prisma/seed.ts` + `"prisma": {"seed": "tsx prisma/seed.ts"}` dans `backend/package.json`, exécuter `npx prisma db seed`.

## Vérification

- `docker compose up --build`, appliquer la migration + le seed.
- Tests `curl` : login admin (cookie posé), `GET /api/auth/me`, accès refusé (403) sur `/api/products` POST avec un compte `SELLER`.
- Parcours navigateur complet : connexion admin → créer unité/catégorie/fournisseur/produit → créer une commande fournisseur → la réceptionner (stock du produit incrémenté, mouvement de stock créé) → créer un client + un animal → réaliser une vente (stock décrémenté, refus si stock insuffisant) → vérifier le tableau de bord et le journal des mouvements de stock.
