import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";

type ReceiveLine = { purchaseOrderItemId: string; quantityReceivedNow: number };

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json().catch(() => ({}));
    const deltas = new Map<string, number>(
      ((body.items as ReceiveLine[] | undefined) ?? []).map((i) => [i.purchaseOrderItemId, i.quantityReceivedNow])
    );

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { items: { include: { product: true } } },
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

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: delta } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "PURCHASE_RECEPTION",
            quantity: delta,
            referenceType: "PurchaseOrder",
            referenceId: order.id,
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
        include: { supplier: true, items: { include: { product: true } } },
      });
    }, { timeout: 15000 });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
