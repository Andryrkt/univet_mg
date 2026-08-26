import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

// Additionne les paiements et les dépenses Espèces / Autre pour un emplacement
// donné, entre l'ouverture de la session et l'instant `until` (maintenant par
// défaut). Utilisé à la fois pour le calcul en direct (caisse encore ouverte)
// et pour figer les montants à la clôture. Les dépenses en espèces sont
// soustraites du montant théorique ; tout le reste n'est qu'informatif.
export async function computeCashSessionTotals(
  db: Db,
  params: { locationId: string; openedAt: Date; until?: Date }
) {
  const until = params.until ?? new Date();
  const window = { createdAt: { gte: params.openedAt, lte: until } };

  const [cashPayments, otherPayments, cashExpenses, otherExpenses] = await Promise.all([
    db.payment.aggregate({
      where: { method: "CASH", ...window, sale: { locationId: params.locationId } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { method: "OTHER", ...window, sale: { locationId: params.locationId } },
      _sum: { amount: true },
    }),
    db.expense.aggregate({
      where: { method: "CASH", locationId: params.locationId, date: { gte: params.openedAt, lte: until } },
      _sum: { amount: true },
    }),
    db.expense.aggregate({
      where: { method: "OTHER", locationId: params.locationId, date: { gte: params.openedAt, lte: until } },
      _sum: { amount: true },
    }),
  ]);

  return {
    cashPayments: cashPayments._sum.amount,
    otherPayments: otherPayments._sum.amount,
    cashExpenses: cashExpenses._sum.amount,
    otherExpenses: otherExpenses._sum.amount,
  };
}
