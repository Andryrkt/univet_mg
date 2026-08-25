import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";
import { addToBatch, consumeBatchesFefo } from "@/lib/stock-batches";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();
    const quantity = Number(body.quantity);

    if (!body.locationId) {
      return NextResponse.json({ error: "locationId est requis" }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity === 0) {
      return NextResponse.json({ error: "quantity doit être un entier non nul" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: params.id } });
      if (!product) throw new ApiError(404, "Produit introuvable");

      const stock = await tx.productStock.findUnique({
        where: { productId_locationId: { productId: params.id, locationId: body.locationId } },
      });
      const currentQuantity = stock?.quantity ?? 0;
      const resultingQuantity = currentQuantity + quantity;
      if (resultingQuantity < 0) {
        throw new ApiError(400, `Stock insuffisant pour cet ajustement (disponible: ${currentQuantity})`);
      }

      await tx.productStock.upsert({
        where: { productId_locationId: { productId: params.id, locationId: body.locationId } },
        create: { productId: params.id, locationId: body.locationId, quantity: resultingQuantity },
        update: { quantity: resultingQuantity },
      });

      if (quantity > 0) {
        const productBatchId = await addToBatch(tx, {
          productId: params.id,
          locationId: body.locationId,
          expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
          quantity,
        });
        await tx.stockMovement.create({
          data: {
            productId: params.id,
            locationId: body.locationId,
            type: "ADJUSTMENT",
            quantity,
            note: body.note || null,
            productBatchId,
            createdById: user.sub,
          },
        });
      } else {
        const consumed = await consumeBatchesFefo(tx, {
          productId: params.id,
          locationId: body.locationId,
          quantity: -quantity,
        });
        for (const c of consumed) {
          await tx.stockMovement.create({
            data: {
              productId: params.id,
              locationId: body.locationId,
              type: "ADJUSTMENT",
              quantity: -c.quantity,
              note: body.note || null,
              productBatchId: c.productBatchId,
              createdById: user.sub,
            },
          });
        }
      }

      return tx.product.findUnique({
        where: { id: params.id },
        include: {
          category: true,
          unit: true,
          sellUnits: { include: { unit: true } },
          stocks: { include: { location: true } },
          batches: { where: { quantityRemaining: { gt: 0 } }, include: { location: true }, orderBy: { expiryDate: "asc" } },
        },
      });
    }, { timeout: 15000 });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
