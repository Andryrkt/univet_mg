import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";
import { computeCashSessionTotals } from "@/lib/cash-session-totals";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR", "SELLER"]);
    const body = await request.json();
    const countedAmount = Number(body.countedAmount);

    if (!Number.isFinite(countedAmount) || countedAmount < 0) {
      return NextResponse.json({ error: "countedAmount doit être un montant positif ou nul" }, { status: 400 });
    }

    const session = await prisma.$transaction(async (tx) => {
      const existing = await tx.cashSession.findUnique({ where: { id: params.id } });
      if (!existing) {
        throw new ApiError(404, "Session de caisse introuvable");
      }
      if (existing.closedAt) {
        throw new ApiError(400, "Cette session de caisse est déjà clôturée");
      }

      const closedAt = new Date();
      const totals = await computeCashSessionTotals(tx, { locationId: existing.locationId, openedAt: existing.openedAt, until: closedAt });
      const cashCollected = totals.cashPayments ?? new Prisma.Decimal(0);
      const otherCollected = totals.otherPayments ?? new Prisma.Decimal(0);
      const cashExpenses = totals.cashExpenses ?? new Prisma.Decimal(0);
      const otherExpenses = totals.otherExpenses ?? new Prisma.Decimal(0);
      const expectedAmount = existing.openingAmount.add(cashCollected).sub(cashExpenses);
      const difference = new Prisma.Decimal(countedAmount).sub(expectedAmount);

      return tx.cashSession.update({
        where: { id: params.id },
        data: {
          closedAt,
          closedById: user.sub,
          expectedAmount,
          otherAmount: otherCollected,
          cashExpenses,
          otherExpenses,
          countedAmount,
          difference,
          note: body.note || null,
        },
        include: {
          location: true,
          openedBy: { select: { id: true, name: true } },
          closedBy: { select: { id: true, name: true } },
        },
      });
    });

    return NextResponse.json(session);
  } catch (error) {
    return handleApiError(error);
  }
}
