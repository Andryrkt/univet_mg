-- DropIndex
DROP INDEX "Category_name_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Category_parentId_name_key" ON "Category"("parentId", "name");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

