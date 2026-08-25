-- AlterEnum: nouveau type de mouvement pour la restitution de stock lors d'une annulation de vente
ALTER TYPE "StockMovementType" ADD VALUE 'SALE_CANCELLATION';

-- Sale : annulation (nullable — une vente est active par défaut)
ALTER TABLE "Sale" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Sale" ADD COLUMN "cancelledById" TEXT;
ALTER TABLE "Sale" ADD COLUMN "cancelReason" TEXT;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
