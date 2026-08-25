import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";
import { addToBatch } from "@/lib/stock-batches";

type ReceiveLine = { purchaseOrderItemId: string; quantityReceivedNow: number; expiryDate?: string };

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json().catch(() => ({}));
    const lines = (body.items as ReceiveLine[] | undefined) ?? [];
    const deltas = new Map<string, number>(lines.map((i) => [i.purchaseOrderItemId, i.quantityReceivedNow]));
    const expiryDates = new Map<string, string | undefined>(lines.map((i) => [i.purchaseOrderItemId, i.expiryDate]));

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { items: { include: { product: { include: { unit: true } } } } },
    });

    if (!order) throw new ApiError(404, "Commande introuvable");
    if (order.status !== "PENDING" && order.status !== "PARTIALLY_RECEIVED") {
      throw new ApiError(400, "Cette commande ne peut plus être réceptionnée");
    }

    const updated = await prisma.$transaction(async (tx) => {
      let anyReceived = false;

      for (const item of order.items) {
        const delta = deltas.get(item.id) ?? 0;
        if (delta === 0) continue;
        if (delta < 0) throw new ApiError(400, "La quantité reçue ne peut pas être négative");

        const remaining = item.quantityOrdered - item.quantityReceived;
        if (delta > remaining) {
          throw new ApiError(
            400,
            `Quantité reçue supérieure au solde restant pour "${item.product.name}" (reste: ${remaining})`
          );
        }

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: { increment: delta } },
        });

        await tx.productStock.upsert({
          where: { productId_locationId: { productId: item.productId, locationId: order.locationId } },
          create: { productId: item.productId, locationId: order.locationId, quantity: delta },
          update: { quantity: { increment: delta } },
        });

        const expiryRaw = expiryDates.get(item.id);
        const productBatchId = await addToBatch(tx, {
          productId: item.productId,
          locationId: order.locationId,
          expiryDate: expiryRaw ? new Date(expiryRaw) : null,
          quantity: delta,
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            locationId: order.locationId,
            type: "PURCHASE_RECEPTION",
            quantity: delta,
            referenceType: "PurchaseOrder",
            referenceId: order.id,
            productBatchId,
            createdById: user.sub,
          },
        });

        anyReceived = true;
      }

      if (!anyReceived) {
        throw new ApiError(400, "Aucune quantité à réceptionner");
      }

      const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: order.id } });
      const fullyReceived = refreshedItems.every((i) => i.quantityReceived >= i.quantityOrdered);

      return tx.purchaseOrder.update({
        where: { id: order.id },
        data: fullyReceived ? { status: "RECEIVED", receivedAt: new Date() } : { status: "PARTIALLY_RECEIVED" },
        include: { supplier: true, location: true, items: { include: { product: { include: { unit: true } } } } },
      });
    }, { timeout: 15000 });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
