import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const categories = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "name est requis" }, { status: 400 });
    }

    const category = await prisma.expenseCategory.create({ data: { name: body.name } });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
