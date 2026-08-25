import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);

    const movements = await prisma.stockMovement.findMany({
      where: { referenceType: "PurchaseOrder", referenceId: params.id, type: "PURCHASE_RECEPTION" },
      include: {
        product: { include: { unit: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Toutes les lignes créées dans la même réception (même transaction) partagent
    // exactement le même horodatage — on les regroupe pour reconstituer chaque livraison.
    const batches = new Map<string, typeof movements>();
    for (const movement of movements) {
      const key = movement.createdAt.toISOString();
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key)!.push(movement);
    }

    const result = Array.from(batches.entries()).map(([createdAt, lines]) => ({
      createdAt,
      createdBy: lines[0].createdBy,
      lines: lines.map((line) => ({
        productId: line.productId,
        productName: line.product.name,
        unitLabel: line.product.unit.symbol ?? line.product.unit.name,
        quantity: line.quantity,
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
