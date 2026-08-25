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
        items: { include: { product: { include: { unit: true } } } },
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

    const existing = await prisma.purchaseOrder.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError(404, "Commande introuvable");

    if (body.status === "CANCELLED") {
      if (existing.status !== "PENDING") {
        throw new ApiError(400, "Seule une commande en attente (rien reçu) peut être annulée");
      }
      const order = await prisma.purchaseOrder.update({
        where: { id: params.id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json(order);
    }

    if (body.status === "RECEIVED") {
      // Clôture : le fournisseur ne livrera pas le solde restant. Le stock déjà reçu
      // reste acquis, on arrête simplement d'attendre le reste — aucune quantité n'est modifiée.
      if (existing.status !== "PARTIALLY_RECEIVED") {
        throw new ApiError(400, "Seule une commande partiellement reçue peut être clôturée ainsi");
      }
      const order = await prisma.purchaseOrder.update({
        where: { id: params.id },
        data: { status: "RECEIVED", receivedAt: new Date() },
      });
      return NextResponse.json(order);
    }

    return NextResponse.json({ error: "status invalide" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
