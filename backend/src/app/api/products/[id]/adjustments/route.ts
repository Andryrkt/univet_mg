import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();
    const quantity = Number(body.quantity);

    if (!Number.isInteger(quantity) || quantity === 0) {
      return NextResponse.json({ error: "quantity doit être un entier non nul" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: params.id } });
      if (!product) throw new ApiError(404, "Produit introuvable");

      const resultingStock = product.stockQuantity + quantity;
      if (resultingStock < 0) {
        throw new ApiError(400, `Stock insuffisant pour cet ajustement (disponible: ${product.stockQuantity})`);
      }

      const updatedProduct = await tx.product.update({
        where: { id: params.id },
        data: { stockQuantity: resultingStock },
        include: { category: true, unit: true },
      });

      await tx.stockMovement.create({
        data: {
          productId: params.id,
          type: "ADJUSTMENT",
          quantity,
          note: body.note || null,
          createdById: user.sub,
        },
      });

      return updatedProduct;
    }, { timeout: 15000 });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
