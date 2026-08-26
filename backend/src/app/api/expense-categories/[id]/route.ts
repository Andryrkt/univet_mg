import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();

    const category = await prisma.expenseCategory.update({
      where: { id: params.id },
      data: { name: body.name },
    });
    return NextResponse.json(category);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    await prisma.expenseCategory.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
