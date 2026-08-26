-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'OTHER');

-- Payment : mode de paiement — les paiements existants sont considérés en
-- espèces (hypothèse par défaut jusqu'ici implicite dans l'app).
ALTER TABLE "Payment" ADD COLUMN "method" "PaymentMethod" NOT NULL DEFAULT 'CASH';

-- CreateTable: CashSession
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "openingAmount" DECIMAL(10,2) NOT NULL,
    "openedById" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedAmount" DECIMAL(10,2),
    "countedAmount" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "note" TEXT,
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
