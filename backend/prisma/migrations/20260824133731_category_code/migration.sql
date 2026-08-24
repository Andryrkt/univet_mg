-- AlterTable: add the column nullable first so existing rows can be backfilled
ALTER TABLE "Category" ADD COLUMN "code" TEXT;

-- Backfill existing categories with a derived 3-letter code (accents stripped, uppercased)
UPDATE "Category"
SET "code" = UPPER(
  LEFT(
    translate(name, 'éèêëàâäôöûüîïçñÉÈÊËÀÂÄÔÖÛÜÎÏÇÑ', 'eeeeaaaoouuiicnEEEEAAAOOUUIICN'),
    3
  )
)
WHERE "code" IS NULL;

-- Enforce NOT NULL + uniqueness now that every row has a value
ALTER TABLE "Category" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");
