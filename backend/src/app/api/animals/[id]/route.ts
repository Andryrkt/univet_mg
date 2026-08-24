import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();

    const animal = await prisma.animal.update({
      where: { id: params.id },
      data: {
        name: body.name,
        species: body.species,
        breed: body.breed ?? null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        notes: body.notes ?? null,
      },
    });
    return NextResponse.json(animal);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    await prisma.animal.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
