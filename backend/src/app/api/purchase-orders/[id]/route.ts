import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();

    if (body.status !== "CANCELLED") {
      return NextResponse.json({ error: "Seule l'annulation est supportée via cette route" }, { status: 400 });
    }

    const existing = await prisma.purchaseOrder.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError(404, "Commande introuvable");
    if (existing.status !== "PENDING") {
      throw new ApiError(400, "Seule une commande en attente peut être annulée");
    }

    const order = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}
