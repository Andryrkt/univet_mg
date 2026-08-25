import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR", "SELLER"]);
    const sales = await prisma.sale.findMany({
      include: {
        client: true,
        seller: { select: { id: true, name: true } },
        location: true,
        items: { include: { product: true } },
        payments: { include: { createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
        cancelledBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch (error) {
    return handleApiError(error);
  }
}

type SaleItemInput = { productId: string; quantity: number; sellUnitId?: string };

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR", "SELLER"]);
    const body = await request.json();
    const items = body.items as SaleItemInput[] | undefined;

    if (!body.clientId || !body.locationId || !items?.length) {
      return NextResponse.json({ error: "clientId, locationId et items sont requis" }, { status: 400 });
    }

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({ error: "Chaque ligne nécessite productId et quantity > 0" }, { status: 400 });
      }
    }

    const sale = await prisma.$transaction(async (tx) => {
      let totalAmount = new Prisma.Decimal(0);
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
          where: { productId_locationId: { productId: item.productId, locationId: body.locationId } },
        });
        const availableQuantity = stock?.quantity ?? 0;
        if (availableQuantity < baseQuantity) {
          throw new ApiError(400, `Stock insuffisant pour "${product.name}" (disponible: ${availableQuantity})`);
        }

        const subtotal = unitPrice.mul(item.quantity);
        totalAmount = totalAmount.add(subtotal);
        saleItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitLabel,
          unitPrice,
          subtotal,
        });
        stockUpdates.push({ productId: item.productId, baseQuantity });
      }

      const amountPaid: Prisma.Decimal =
        body.amountPaid === undefined || body.amountPaid === null
          ? totalAmount
          : new Prisma.Decimal(body.amountPaid);
      if (amountPaid.lessThan(0) || amountPaid.greaterThan(totalAmount)) {
        throw new ApiError(400, "Le montant payé doit être compris entre 0 et le total de la vente");
      }
      const paymentStatus = amountPaid.greaterThanOrEqualTo(totalAmount)
        ? "PAID"
        : amountPaid.greaterThan(0)
          ? "PARTIAL"
          : "UNPAID";

      let cashReceived: Prisma.Decimal | undefined;
      if (body.cashReceived !== undefined && body.cashReceived !== null) {
        cashReceived = new Prisma.Decimal(body.cashReceived);
        if (cashReceived.lessThan(amountPaid)) {
          throw new ApiError(400, "Le montant reçu ne peut pas être inférieur au montant payé");
        }
      }

      const createdSale = await tx.sale.create({
        data: {
          clientId: body.clientId,
          sellerId: user.sub,
          locationId: body.locationId,
          totalAmount,
          amountPaid,
          paymentStatus,
          items: { create: saleItemsData },
          payments: amountPaid.greaterThan(0)
            ? { create: [{ amount: amountPaid, cashReceived, createdById: user.sub }] }
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
          where: { productId_locationId: { productId: update.productId, locationId: body.locationId } },
          data: { quantity: { decrement: update.baseQuantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: update.productId,
            locationId: body.locationId,
            type: "SALE",
            quantity: -update.baseQuantity,
            referenceType: "Sale",
            referenceId: createdSale.id,
            createdById: user.sub,
          },
        });
      }

      return createdSale;
    }, { timeout: 15000 });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
