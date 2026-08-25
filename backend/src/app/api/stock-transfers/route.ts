import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";
import { addToBatch, consumeBatchesFefo } from "@/lib/stock-batches";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const transfers = await prisma.stockTransfer.findMany({
      include: {
        product: true,
        fromLocation: true,
        toLocation: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(transfers);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();
    const quantity = Number(body.quantity);

    if (!body.productId || !body.fromLocationId || !body.toLocationId) {
      return NextResponse.json(
        { error: "productId, fromLocationId et toLocationId sont requis" },
        { status: 400 }
      );
    }
    if (body.fromLocationId === body.toLocationId) {
      return NextResponse.json({ error: "L'emplacement source et destination doivent être différents" }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "quantity doit être un entier > 0" }, { status: 400 });
    }

    const transfer = await prisma.$transaction(async (tx) => {
      const sourceStock = await tx.productStock.findUnique({
        where: { productId_locationId: { productId: body.productId, locationId: body.fromLocationId } },
      });
      const available = sourceStock?.quantity ?? 0;
      if (available < quantity) {
        throw new ApiError(400, `Stock insuffisant à l'emplacement source (disponible: ${available})`);
      }

      await tx.productStock.update({
        where: { productId_locationId: { productId: body.productId, locationId: body.fromLocationId } },
        data: { quantity: { decrement: quantity } },
      });

      await tx.productStock.upsert({
        where: { productId_locationId: { productId: body.productId, locationId: body.toLocationId } },
        create: { productId: body.productId, locationId: body.toLocationId, quantity },
        update: { quantity: { increment: quantity } },
      });

      const createdTransfer = await tx.stockTransfer.create({
        data: {
          productId: body.productId,
          fromLocationId: body.fromLocationId,
          toLocationId: body.toLocationId,
          quantity,
          note: body.note || null,
          createdById: user.sub,
        },
        include: {
          product: true,
          fromLocation: true,
          toLocation: true,
          createdBy: { select: { id: true, name: true } },
        },
      });

      const consumed = await consumeBatchesFefo(tx, {
        productId: body.productId,
        locationId: body.fromLocationId,
        quantity,
      });

      for (const c of consumed) {
        const sourceBatch = await tx.productBatch.findUniqueOrThrow({ where: { id: c.productBatchId } });
        const destBatchId = await addToBatch(tx, {
          productId: body.productId,
          locationId: body.toLocationId,
          expiryDate: sourceBatch.expiryDate,
          quantity: c.quantity,
        });

        await tx.stockMovement.create({
          data: {
            productId: body.productId,
            locationId: body.fromLocationId,
            type: "TRANSFER_OUT",
            quantity: -c.quantity,
            referenceType: "StockTransfer",
            referenceId: createdTransfer.id,
            productBatchId: c.productBatchId,
            createdById: user.sub,
          },
        });
        await tx.stockMovement.create({
          data: {
            productId: body.productId,
            locationId: body.toLocationId,
            type: "TRANSFER_IN",
            quantity: c.quantity,
            referenceType: "StockTransfer",
            referenceId: createdTransfer.id,
            productBatchId: destBatchId,
            createdById: user.sub,
          },
        });
      }

      return createdTransfer;
    }, { timeout: 15000 });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
