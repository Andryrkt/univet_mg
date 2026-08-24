import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        name: body.name,
        contactName: body.contactName ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        address: body.address ?? null,
      },
    });
    return NextResponse.json(supplier);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    await prisma.supplier.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
