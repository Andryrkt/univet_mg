import type { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api-helpers";

type Tx = Prisma.TransactionClient;

// Consomme `quantity` unités du stock d'un produit à un emplacement en suivant
// l'ordre FEFO (first-expire-first-out) : les lots dont la péremption est la
// plus proche sont vidés en premier ; les lots sans date connue sont consommés
// en dernier. Retourne le détail des lots réellement consommés, pour tracer
// chaque mouvement de stock jusqu'à son lot d'origine.
export async function consumeBatchesFefo(
  tx: Tx,
  params: { productId: string; locationId: string; quantity: number }
): Promise<{ productBatchId: string; quantity: number }[]> {
  const { productId, locationId, quantity } = params;
  if (quantity <= 0) return [];

  const batches = await tx.productBatch.findMany({
    where: { productId, locationId, quantityRemaining: { gt: 0 } },
  });
  batches.sort((a, b) => {
    const aTime = a.expiryDate ? a.expiryDate.getTime() : Infinity;
    const bTime = b.expiryDate ? b.expiryDate.getTime() : Infinity;
    return aTime - bTime;
  });

  const consumed: { productBatchId: string; quantity: number }[] = [];
  let remaining = quantity;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantityRemaining, remaining);
    if (take <= 0) continue;
    await tx.productBatch.update({
      where: { id: batch.id },
      data: { quantityRemaining: { decrement: take } },
    });
    consumed.push({ productBatchId: batch.id, quantity: take });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new ApiError(400, "Stock insuffisant (incohérence des lots) — contactez un administrateur");
  }

  return consumed;
}

// Ajoute `quantity` au lot existant du produit/emplacement partageant exactement
// la même date de péremption (y compris "aucune date connue"), ou crée un
// nouveau lot sinon. Retourne l'id du lot concerné.
export async function addToBatch(
  tx: Tx,
  params: { productId: string; locationId: string; expiryDate: Date | null; quantity: number }
): Promise<string> {
  const { productId, locationId, expiryDate, quantity } = params;

  const existing = await tx.productBatch.findFirst({
    where: { productId, locationId, expiryDate },
  });
  if (existing) {
    await tx.productBatch.update({
      where: { id: existing.id },
      data: { quantityRemaining: { increment: quantity } },
    });
    return existing.id;
  }

  const created = await tx.productBatch.create({
    data: { productId, locationId, expiryDate, quantityRemaining: quantity },
  });
  return created.id;
}

// Restitue `quantity` à un lot précis (annulation de vente).
export async function restoreBatch(tx: Tx, productBatchId: string, quantity: number): Promise<void> {
  await tx.productBatch.update({
    where: { id: productBatchId },
    data: { quantityRemaining: { increment: quantity } },
  });
}
