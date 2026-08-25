import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();

    const location = await prisma.location.update({
      where: { id: params.id },
      data: {
        name: body.name,
        address: body.address ?? null,
        phone: body.phone ?? null,
        isActive: body.isActive,
      },
    });
    return NextResponse.json(location);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    // Désactivation plutôt que suppression : préserve l'historique (ventes,
    // commandes, mouvements) déjà rattaché à cet emplacement.
    await prisma.location.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
