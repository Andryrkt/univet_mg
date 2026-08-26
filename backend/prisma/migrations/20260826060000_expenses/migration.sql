-- CashSession : ventilation des dépenses (informatif pour "autre", déductif
-- pour "espèces" — voir le calcul du montant théorique dans l'application).
ALTER TABLE "CashSession" ADD COLUMN "cashExpenses" DECIMAL(10,2);
ALTER TABLE "CashSession" ADD COLUMN "otherExpenses" DECIMAL(10,2);

-- CreateTable: ExpenseCategory
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

-- Catégories de départ (personnalisables ensuite depuis l'application).
INSERT INTO "ExpenseCategory" ("id", "name") VALUES
  ('expcat_loyer', 'Loyer'),
  ('expcat_salaires', 'Salaires'),
  ('expcat_transport', 'Transport'),
  ('expcat_fournitures', 'Fournitures'),
  ('expcat_energie', 'Électricité/Eau'),
  ('expcat_autre', 'Autre');

-- CreateTable: Expense
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(10,2) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
