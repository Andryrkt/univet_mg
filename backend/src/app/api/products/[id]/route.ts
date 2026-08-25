import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: body.name,
        sku: body.sku ?? null,
        categoryId: body.categoryId,
        unitId: body.unitId,
        purchasePrice: body.purchasePrice,
        sellingPrice: body.sellingPrice,
        alertThreshold: body.alertThreshold,
        isActive: body.isActive,
      },
      include: {
        category: true,
        unit: true,
        sellUnits: { include: { unit: true } },
        stocks: { include: { location: true } },
        batches: { where: { quantityRemaining: { gt: 0 } }, include: { location: true }, orderBy: { expiryDate: "asc" } },
      },
    });
    return NextResponse.json(product);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    await prisma.product.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
