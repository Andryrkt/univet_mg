import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
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
    if (typeof body.code !== "string" || !/^[A-Za-z]{3}$/.test(body.code)) {
      return NextResponse.json({ error: "code doit contenir exactement 3 lettres" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name: body.name,
        code: body.code.toUpperCase(),
        description: body.description ?? null,
        parentId: body.parentId ?? null,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
