-- CreateTable: ProductBatch (lots avec date de péremption, pour le suivi FEFO)
CREATE TABLE "ProductBatch" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "quantityRemaining" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBatch_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill : le stock existant devient un lot unique sans date de péremption connue.
INSERT INTO "ProductBatch" ("id", "productId", "locationId", "expiryDate", "quantityRemaining")
SELECT 'batch_' || "id", "productId", "locationId", NULL, "quantity" FROM "ProductStock" WHERE "quantity" > 0;

-- StockMovement : rattachement optionnel au lot concerné (traçabilité FEFO)
ALTER TABLE "StockMovement" ADD COLUMN "productBatchId" TEXT;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productBatchId_fkey" FOREIGN KEY ("productBatchId") REFERENCES "ProductBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ClinicSettings : fenêtre d'alerte avant péremption (en jours)
ALTER TABLE "ClinicSettings" ADD COLUMN "expiryAlertDays" INTEGER NOT NULL DEFAULT 90;
