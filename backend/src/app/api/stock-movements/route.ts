import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") ?? undefined;
    const locationId = searchParams.get("locationId") ?? undefined;

    const movements = await prisma.stockMovement.findMany({
      where: { productId, locationId },
      include: {
        product: true,
        location: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(movements);
  } catch (error) {
    return handleApiError(error);
  }
}
