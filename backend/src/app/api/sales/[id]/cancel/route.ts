import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";
import { restoreBatch } from "@/lib/stock-batches";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json().catch(() => ({}));

    const sale = await prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({ where: { id: params.id } });
      if (!existing) {
        throw new ApiError(404, "Vente introuvable");
      }
      if (existing.cancelledAt) {
        throw new ApiError(400, "Cette vente est déjà annulée");
      }

      const movements = await tx.stockMovement.findMany({
        where: { referenceType: "Sale", referenceId: existing.id, type: "SALE" },
      });

      for (const m of movements) {
        await tx.productStock.update({
          where: { productId_locationId: { productId: m.productId, locationId: m.locationId } },
          data: { quantity: { increment: -m.quantity } },
        });
        if (m.productBatchId) {
          await restoreBatch(tx, m.productBatchId, -m.quantity);
        }
        await tx.stockMovement.create({
          data: {
            productId: m.productId,
            locationId: m.locationId,
            type: "SALE_CANCELLATION",
            quantity: -m.quantity,
            referenceType: "Sale",
            referenceId: existing.id,
            productBatchId: m.productBatchId,
            createdById: user.sub,
          },
        });
      }

      return tx.sale.update({
        where: { id: params.id },
        data: {
          cancelledAt: new Date(),
          cancelledById: user.sub,
          cancelReason: body.reason || null,
        },
        include: {
          client: true,
          seller: { select: { id: true, name: true } },
          location: true,
          items: { include: { product: true } },
          payments: { include: { createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
          cancelledBy: { select: { id: true, name: true } },
        },
      });
    }, { timeout: 15000 });

    return NextResponse.json(sale);
  } catch (error) {
    return handleApiError(error);
  }
}
