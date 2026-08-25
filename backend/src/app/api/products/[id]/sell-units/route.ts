import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();

    const conversionFactor = Number(body.conversionFactor);
    if (!body.unitId || !Number.isInteger(conversionFactor) || conversionFactor <= 0 || body.sellingPrice == null) {
      return NextResponse.json(
        { error: "unitId, conversionFactor (entier > 0) et sellingPrice sont requis" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({ where: { id: params.id } });
    if (!product) throw new ApiError(404, "Produit introuvable");
    if (body.unitId === product.unitId) {
      throw new ApiError(400, "Cette unité est déjà l'unité de stock du produit — modifiez le prix de vente de base");
    }

    const sellUnit = await prisma.productSellUnit.create({
      data: {
        productId: params.id,
        unitId: body.unitId,
        conversionFactor,
        sellingPrice: body.sellingPrice,
      },
      include: { unit: true },
    });
    return NextResponse.json(sellUnit, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
