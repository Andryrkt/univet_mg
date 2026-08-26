import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

// Additionne les paiements Espèces et Autre encaissés pour un emplacement
// donné, entre l'ouverture de la session et l'instant `until` (maintenant par
// défaut). Utilisé à la fois pour le calcul en direct (caisse encore ouverte)
// et pour figer les montants à la clôture.
export async function computeCashSessionTotals(
  db: Db,
  params: { locationId: string; openedAt: Date; until?: Date }
) {
  const until = params.until ?? new Date();

  const [cash, other] = await Promise.all([
    db.payment.aggregate({
      where: {
        method: "CASH",
        createdAt: { gte: params.openedAt, lte: until },
        sale: { locationId: params.locationId },
      },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: {
        method: "OTHER",
        createdAt: { gte: params.openedAt, lte: until },
        sale: { locationId: params.locationId },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    cash: cash._sum.amount,
    other: other._sum.amount,
  };
}
