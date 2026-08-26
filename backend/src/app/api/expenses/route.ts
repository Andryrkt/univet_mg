import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResponse } from "@/lib/pagination";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR", "SELLER"]);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const pagination = parsePagination(searchParams);

    const where: Prisma.ExpenseWhereInput = search
      ? {
          OR: [
            { category: { name: { contains: search, mode: "insensitive" } } },
            { location: { name: { contains: search, mode: "insensitive" } } },
            { note: { contains: search, mode: "insensitive" } },
            { createdBy: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {};

    const include = {
      category: true,
      location: true,
      createdBy: { select: { id: true, name: true } },
    };

    if (pagination) {
      const [items, total] = await Promise.all([
        prisma.expense.findMany({ where, include, orderBy: { date: "desc" }, skip: pagination.skip, take: pagination.take }),
        prisma.expense.count({ where }),
      ]);
      return NextResponse.json(paginatedResponse(items, total, pagination));
    }

    const expenses = await prisma.expense.findMany({ where, include, orderBy: { date: "desc" }, take: 200 });
    return NextResponse.json(expenses);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR", "SELLER"]);
    const body = await request.json();
    const amount = Number(body.amount);

    if (!body.categoryId || !body.locationId) {
      return NextResponse.json({ error: "categoryId et locationId sont requis" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount doit être un montant positif" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        date: body.date ? new Date(body.date) : undefined,
        amount,
        categoryId: body.categoryId,
        locationId: body.locationId,
        method: body.method === "OTHER" ? "OTHER" : "CASH",
        note: body.note || null,
        createdById: user.sub,
      },
      include: {
        category: true,
        location: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
