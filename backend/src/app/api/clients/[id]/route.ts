import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(request);
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { animals: true, sales: { include: { items: true }, orderBy: { createdAt: "desc" } } },
    });
    if (!client) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }
    return NextResponse.json(client);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();

    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email ?? null,
        address: body.address ?? null,
      },
    });
    return NextResponse.json(client);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    await prisma.client.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
