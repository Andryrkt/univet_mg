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
        items: { include: { product: true } },
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

    if (!body.clientId || !items?.length) {
      return NextResponse.json({ error: "clientId et items sont requis" }, { status: 400 });
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
        if (product.stockQuantity < baseQuantity) {
          throw new ApiError(400, `Stock insuffisant pour "${product.name}" (disponible: ${product.stockQuantity})`);
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

      const createdSale = await tx.sale.create({
        data: {
          clientId: body.clientId,
          sellerId: user.sub,
          totalAmount,
          items: { create: saleItemsData },
        },
        include: { client: true, seller: { select: { id: true, name: true } }, items: { include: { product: true } } },
      });

      for (const update of stockUpdates) {
        await tx.product.update({
          where: { id: update.productId },
          data: { stockQuantity: { decrement: update.baseQuantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: update.productId,
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
