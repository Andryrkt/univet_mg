import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR", "SELLER"]);
    const sessions = await prisma.cashSession.findMany({
      include: {
        location: true,
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
      orderBy: { openedAt: "desc" },
      take: 200,
    });
    return NextResponse.json(sessions);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR", "SELLER"]);
    const body = await request.json();
    const openingAmount = Number(body.openingAmount);

    if (!body.locationId) {
      return NextResponse.json({ error: "locationId est requis" }, { status: 400 });
    }
    if (!Number.isFinite(openingAmount) || openingAmount < 0) {
      return NextResponse.json({ error: "openingAmount doit être un montant positif ou nul" }, { status: 400 });
    }

    const existingOpen = await prisma.cashSession.findFirst({
      where: { locationId: body.locationId, closedAt: null },
    });
    if (existingOpen) {
      throw new ApiError(400, "Une session de caisse est déjà ouverte pour cet emplacement");
    }

    const session = await prisma.cashSession.create({
      data: {
        locationId: body.locationId,
        openingAmount,
        openedById: user.sub,
      },
      include: {
        location: true,
        openedBy: { select: { id: true, name: true } },
        closedBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
