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

type SaleItemInput = { productId: string; quantity: number };

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
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.isActive) {
          throw new ApiError(400, `Produit introuvable: ${item.productId}`);
        }
        if (product.stockQuantity < item.quantity) {
          throw new ApiError(400, `Stock insuffisant pour "${product.name}" (disponible: ${product.stockQuantity})`);
        }

        const subtotal = product.sellingPrice.mul(item.quantity);
        totalAmount = totalAmount.add(subtotal);
        saleItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          subtotal,
        });
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

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "SALE",
            quantity: -item.quantity,
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
