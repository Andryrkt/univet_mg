import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR", "SELLER"]);
    const body = await request.json();

    if (body.amount === undefined || body.amount === null || Number(body.amount) <= 0) {
      return NextResponse.json({ error: "amount doit être un montant positif" }, { status: 400 });
    }
    const amount = new Prisma.Decimal(body.amount);

    let cashReceived: Prisma.Decimal | undefined;
    if (body.cashReceived !== undefined && body.cashReceived !== null) {
      cashReceived = new Prisma.Decimal(body.cashReceived);
      if (cashReceived.lessThan(amount)) {
        return NextResponse.json({ error: "Le montant reçu ne peut pas être inférieur au montant payé" }, { status: 400 });
      }
    }

    const sale = await prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({ where: { id: params.id } });
      if (!existing) {
        throw new ApiError(404, "Vente introuvable");
      }
      if (existing.cancelledAt) {
        throw new ApiError(400, "Cette vente est annulée");
      }
      const remaining = existing.totalAmount.sub(existing.amountPaid);
      if (amount.greaterThan(remaining)) {
        throw new ApiError(400, `Le montant dépasse le solde restant dû (${remaining.toString()})`);
      }

      const newAmountPaid = existing.amountPaid.add(amount);
      const paymentStatus = newAmountPaid.greaterThanOrEqualTo(existing.totalAmount)
        ? "PAID"
        : newAmountPaid.greaterThan(0)
          ? "PARTIAL"
          : "UNPAID";

      return tx.sale.update({
        where: { id: params.id },
        data: {
          amountPaid: newAmountPaid,
          paymentStatus,
          payments: { create: [{ amount, cashReceived, note: body.note || null, createdById: user.sub }] },
        },
        include: {
          client: true,
          seller: { select: { id: true, name: true } },
          location: true,
          items: { include: { product: true } },
          payments: { include: { createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
          cancelledBy: { select: { id: true, name: true } },
        },
      });
    }, { timeout: 15000 });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
