import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(locations);
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

    const location = await prisma.location.create({
      data: {
        name: body.name,
        address: body.address ?? null,
        phone: body.phone ?? null,
      },
    });
    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
