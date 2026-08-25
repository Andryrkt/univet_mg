-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID');

-- Sale : montant réellement encaissé (nullable puis backfill puis NOT NULL)
ALTER TABLE "Sale" ADD COLUMN "amountPaid" DECIMAL(10,2);
UPDATE "Sale" SET "amountPaid" = "totalAmount";
ALTER TABLE "Sale" ALTER COLUMN "amountPaid" SET NOT NULL;
ALTER TABLE "Sale" ALTER COLUMN "amountPaid" SET DEFAULT 0;

-- Sale : statut de paiement — les ventes existantes sont considérées payées intégralement
ALTER TABLE "Sale" ADD COLUMN "paymentStatus" "PaymentStatus";
UPDATE "Sale" SET "paymentStatus" = 'PAID';
ALTER TABLE "Sale" ALTER COLUMN "paymentStatus" SET NOT NULL;
ALTER TABLE "Sale" ALTER COLUMN "paymentStatus" SET DEFAULT 'PAID';

-- CreateTable: Payment (historique des règlements par vente)
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill : chaque vente existante devient son propre règlement initial complet
INSERT INTO "Payment" ("id", "saleId", "amount", "createdById", "createdAt")
SELECT 'pay_' || "id", "id", "totalAmount", "sellerId", "createdAt" FROM "Sale";
