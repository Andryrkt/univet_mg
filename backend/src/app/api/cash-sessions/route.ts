import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResponse } from "@/lib/pagination";
import { computeCashSessionTotals } from "@/lib/cash-session-totals";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR", "SELLER"]);
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId") ?? undefined;
    const status = searchParams.get("status");
    const pagination = parsePagination(searchParams);

    const where: Prisma.CashSessionWhereInput = {
      locationId,
      ...(status === "open" ? { closedAt: null } : status === "closed" ? { closedAt: { not: null } } : {}),
    };

    const include = {
      location: true,
      openedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
    };

    // Pour une session encore ouverte, on calcule en direct ce qui a déjà été
    // encaissé / dépensé (espèces / autre) depuis l'ouverture, pour affichage seulement.
    async function withLiveTotals<T extends { closedAt: Date | null; locationId: string; openedAt: Date }>(sessions: T[]) {
      return Promise.all(
        sessions.map(async (s) => {
          if (s.closedAt) return s;
          const totals = await computeCashSessionTotals(prisma, { locationId: s.locationId, openedAt: s.openedAt });
          return {
            ...s,
            liveCashCollected: totals.cashPayments,
            liveOtherCollected: totals.otherPayments,
            liveCashExpenses: totals.cashExpenses,
            liveOtherExpenses: totals.otherExpenses,
          };
        })
      );
    }

    if (pagination) {
      const [items, total] = await Promise.all([
        prisma.cashSession.findMany({ where, include, orderBy: { openedAt: "desc" }, skip: pagination.skip, take: pagination.take }),
        prisma.cashSession.count({ where }),
      ]);
      return NextResponse.json(paginatedResponse(await withLiveTotals(items), total, pagination));
    }

    const sessions = await prisma.cashSession.findMany({ where, include, orderBy: { openedAt: "desc" }, take: 200 });
    return NextResponse.json(await withLiveTotals(sessions));
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
