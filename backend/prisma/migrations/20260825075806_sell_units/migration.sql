-- AlterTable: add unitLabel nullable first so existing rows can be backfilled
ALTER TABLE "SaleItem" ADD COLUMN "unitLabel" TEXT;

-- Backfill existing sale items using each product's current unit
UPDATE "SaleItem" si
SET "unitLabel" = COALESCE(u."symbol", u."name")
FROM "Product" p
JOIN "Unit" u ON u."id" = p."unitId"
WHERE si."productId" = p."id" AND si."unitLabel" IS NULL;

ALTER TABLE "SaleItem" ALTER COLUMN "unitLabel" SET NOT NULL;

-- CreateTable
CREATE TABLE "ProductSellUnit" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "conversionFactor" INTEGER NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSellUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductSellUnit_productId_unitId_key" ON "ProductSellUnit"("productId", "unitId");

-- AddForeignKey
ALTER TABLE "ProductSellUnit" ADD CONSTRAINT "ProductSellUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSellUnit" ADD CONSTRAINT "ProductSellUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
