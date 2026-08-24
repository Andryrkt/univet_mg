import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const products = await prisma.product.findMany({
      include: { category: true, unit: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();

    if (!body.name || !body.categoryId || !body.unitId || body.purchasePrice == null || body.sellingPrice == null) {
      return NextResponse.json(
        { error: "name, categoryId, unitId, purchasePrice et sellingPrice sont requis" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        sku: body.sku ?? null,
        categoryId: body.categoryId,
        unitId: body.unitId,
        purchasePrice: body.purchasePrice,
        sellingPrice: body.sellingPrice,
        alertThreshold: body.alertThreshold ?? 0,
      },
      include: { category: true, unit: true },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
