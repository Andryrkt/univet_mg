import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";

export async function PATCH(request: Request, { params }: { params: { id: string; sellUnitId: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();

    const conversionFactor = Number(body.conversionFactor);
    if (!Number.isInteger(conversionFactor) || conversionFactor <= 0 || body.sellingPrice == null) {
      return NextResponse.json({ error: "conversionFactor (entier > 0) et sellingPrice sont requis" }, { status: 400 });
    }

    const sellUnit = await prisma.productSellUnit.update({
      where: { id: params.sellUnitId },
      data: { conversionFactor, sellingPrice: body.sellingPrice },
      include: { unit: true },
    });
    return NextResponse.json(sellUnit);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string; sellUnitId: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    await prisma.productSellUnit.delete({ where: { id: params.sellUnitId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
