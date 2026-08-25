import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR", "SELLER"]);
    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        seller: { select: { id: true, name: true } },
        location: true,
        items: { include: { product: true } },
        payments: { include: { createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
        cancelledBy: { select: { id: true, name: true } },
      },
    });
    if (!sale) {
      return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
    }
    return NextResponse.json(sale);
  } catch (error) {
    return handleApiError(error);
  }
}
