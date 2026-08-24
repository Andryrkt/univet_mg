import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";

type ReceiveOverride = { purchaseOrderItemId: string; quantityReceived: number };

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json().catch(() => ({}));
    const overrides = new Map<string, number>(
      ((body.items as ReceiveOverride[] | undefined) ?? []).map((i) => [i.purchaseOrderItemId, i.quantityReceived])
    );

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!order) throw new ApiError(404, "Commande introuvable");
    if (order.status !== "PENDING") throw new ApiError(400, "Cette commande a déjà été traitée");

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const receivedQty = overrides.get(item.id) ?? item.quantityOrdered;
        if (receivedQty < 0) throw new ApiError(400, "La quantité reçue ne peut pas être négative");

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: receivedQty },
        });

        if (receivedQty > 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: receivedQty } },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: "PURCHASE_RECEPTION",
              quantity: receivedQty,
              referenceType: "PurchaseOrder",
              referenceId: order.id,
              createdById: user.sub,
            },
          });
        }
      }

      return tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: "RECEIVED", receivedAt: new Date() },
        include: { supplier: true, items: { include: { product: true } } },
      });
    }, { timeout: 15000 });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
