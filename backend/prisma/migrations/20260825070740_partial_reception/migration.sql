-- AlterEnum: allow partial receptions on a purchase order
ALTER TYPE "PurchaseOrderStatus" ADD VALUE 'PARTIALLY_RECEIVED';

-- Backfill: quantityReceived becomes a running total (0 = nothing received yet),
-- instead of nullable "not yet received".
UPDATE "PurchaseOrderItem" SET "quantityReceived" = 0 WHERE "quantityReceived" IS NULL;
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "quantityReceived" SET DEFAULT 0;
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "quantityReceived" SET NOT NULL;
