-- AlterEnum: new movement types for stock transfers between locations
ALTER TYPE "StockMovementType" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "StockMovementType" ADD VALUE 'TRANSFER_IN';

-- CreateTable: Location
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- Emplacement par défaut : reçoit tout le stock/historique existant.
INSERT INTO "Location" ("id", "name") VALUES ('default-location', 'Emplacement principal');

-- CreateTable: ProductStock
CREATE TABLE "ProductStock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductStock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductStock_productId_locationId_key" ON "ProductStock"("productId", "locationId");
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: chaque produit garde son stock actuel, rattaché à l'emplacement par défaut.
INSERT INTO "ProductStock" ("id", "productId", "locationId", "quantity")
SELECT 'ps_' || "id", "id", 'default-location', "stockQuantity" FROM "Product";

-- Product : le stock n'est plus une colonne globale, il vit dans ProductStock.
ALTER TABLE "Product" DROP COLUMN "stockQuantity";

-- PurchaseOrder : ajout de l'emplacement destinataire (nullable puis backfill puis NOT NULL)
ALTER TABLE "PurchaseOrder" ADD COLUMN "locationId" TEXT;
UPDATE "PurchaseOrder" SET "locationId" = 'default-location' WHERE "locationId" IS NULL;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sale : ajout de l'emplacement de vente
ALTER TABLE "Sale" ADD COLUMN "locationId" TEXT;
UPDATE "Sale" SET "locationId" = 'default-location' WHERE "locationId" IS NULL;
ALTER TABLE "Sale" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- StockMovement : ajout de l'emplacement concerné
ALTER TABLE "StockMovement" ADD COLUMN "locationId" TEXT;
UPDATE "StockMovement" SET "locationId" = 'default-location' WHERE "locationId" IS NULL;
ALTER TABLE "StockMovement" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: StockTransfer
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
