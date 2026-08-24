import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";
import { hashPassword } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const body = await request.json();

    const data: Record<string, unknown> = {
      name: body.name,
      role: body.role,
      isActive: body.isActive,
    };
    if (body.password) {
      data.passwordHash = await hashPassword(body.password);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN"]);
    await prisma.user.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
