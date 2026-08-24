import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const units = await prisma.unit.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(units);
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

    const unit = await prisma.unit.create({
      data: { name: body.name, symbol: body.symbol ?? null },
    });
    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
