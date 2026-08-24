import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(suppliers);
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

    const supplier = await prisma.supplier.create({
      data: {
        name: body.name,
        contactName: body.contactName ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        address: body.address ?? null,
      },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
