import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";
import { consumeBatchesFefo } from "@/lib/stock-batches";

type SaleItemInput = { productId: string; quantity: number; sellUnitId?: string };

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR", "SELLER"]);
    const body = await request.json();
    const items = body.items as SaleItemInput[] | undefined;

    if (!items?.length) {
      return NextResponse.json({ error: "items est requis" }, { status: 400 });
    }
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({ error: "Chaque ligne nécessite productId et quantity > 0" }, { status: 400 });
      }
    }

    const sale = await prisma.$transaction(async (tx) => {
      const existingSale = await tx.sale.findUnique({ where: { id: params.id } });
      if (!existingSale) {
        throw new ApiError(404, "Vente introuvable");
      }
      if (existingSale.cancelledAt) {
        throw new ApiError(400, "Impossible d'ajouter des produits à une vente annulée");
      }

      let addedAmount = new Prisma.Decimal(0);
      const saleItemsData: {
        productId: string;
        quantity: number;
        unitLabel: string;
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }[] = [];
      const stockUpdates: { productId: string; baseQuantity: number }[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { unit: true, sellUnits: { include: { unit: true } } },
        });
        if (!product || !product.isActive) {
          throw new ApiError(400, `Produit introuvable: ${item.productId}`);
        }

        let conversionFactor = 1;
        let unitPrice = product.sellingPrice;
        let unitLabel = product.unit.symbol ?? product.unit.name;

        if (item.sellUnitId) {
          const sellUnit = product.sellUnits.find((su) => su.id === item.sellUnitId);
          if (!sellUnit) {
            throw new ApiError(400, `Unité de vente invalide pour "${product.name}"`);
          }
          conversionFactor = sellUnit.conversionFactor;
          unitPrice = sellUnit.sellingPrice;
          unitLabel = sellUnit.unit.symbol ?? sellUnit.unit.name;
        }

        const baseQuantity = item.quantity * conversionFactor;

        const stock = await tx.productStock.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: existingSale.locationId } },
        });
        const availableQuantity = stock?.quantity ?? 0;
        if (availableQuantity < baseQuantity) {
          throw new ApiError(400, `Stock insuffisant pour "${product.name}" (disponible: ${availableQuantity})`);
        }

        const subtotal = unitPrice.mul(item.quantity);
        addedAmount = addedAmount.add(subtotal);
        saleItemsData.push({ productId: item.productId, quantity: item.quantity, unitLabel, unitPrice, subtotal });
        stockUpdates.push({ productId: item.productId, baseQuantity });
      }

      const newTotalAmount = existingSale.totalAmount.add(addedAmount);
      const additionalPaid: Prisma.Decimal =
        body.amountPaid === undefined || body.amountPaid === null
          ? addedAmount
          : new Prisma.Decimal(body.amountPaid);
      if (additionalPaid.lessThan(0) || additionalPaid.greaterThan(addedAmount)) {
        throw new ApiError(400, "Le montant payé pour cet ajout doit être compris entre 0 et le montant ajouté");
      }
      const newAmountPaid = existingSale.amountPaid.add(additionalPaid);
      const paymentStatus = newAmountPaid.greaterThanOrEqualTo(newTotalAmount)
        ? "PAID"
        : newAmountPaid.greaterThan(0)
          ? "PARTIAL"
          : "UNPAID";

      let cashReceived: Prisma.Decimal | undefined;
      if (body.cashReceived !== undefined && body.cashReceived !== null) {
        cashReceived = new Prisma.Decimal(body.cashReceived);
        if (cashReceived.lessThan(additionalPaid)) {
          throw new ApiError(400, "Le montant reçu ne peut pas être inférieur au montant payé");
        }
      }

      const updatedSale = await tx.sale.update({
        where: { id: params.id },
        data: {
          totalAmount: newTotalAmount,
          amountPaid: newAmountPaid,
          paymentStatus,
          items: { create: saleItemsData },
          payments: additionalPaid.greaterThan(0)
            ? {
                create: [
                  {
                    amount: additionalPaid,
                    cashReceived,
                    note: "Ajout de produits après validation",
                    createdById: user.sub,
                  },
                ],
              }
            : undefined,
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

      for (const update of stockUpdates) {
        await tx.productStock.update({
          where: { productId_locationId: { productId: update.productId, locationId: existingSale.locationId } },
          data: { quantity: { decrement: update.baseQuantity } },
        });

        const consumed = await consumeBatchesFefo(tx, {
          productId: update.productId,
          locationId: existingSale.locationId,
          quantity: update.baseQuantity,
        });
        for (const c of consumed) {
          await tx.stockMovement.create({
            data: {
              productId: update.productId,
              locationId: existingSale.locationId,
              type: "SALE",
              quantity: -c.quantity,
              referenceType: "Sale",
              referenceId: updatedSale.id,
              productBatchId: c.productBatchId,
              createdById: user.sub,
            },
          });
        }
      }

      return updatedSale;
    }, { timeout: 15000 });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
