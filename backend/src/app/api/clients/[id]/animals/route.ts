import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError } from "@/lib/api-helpers";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    // ADMIN, MODERATOR et SELLER peuvent tous enregistrer un animal (nécessaire au point de vente)
    await requireUser(request);
    const body = await request.json();

    if (!body.name || !body.species) {
      return NextResponse.json({ error: "name et species sont requis" }, { status: 400 });
    }

    const animal = await prisma.animal.create({
      data: {
        clientId: params.id,
        name: body.name,
        species: body.species,
        breed: body.breed ?? null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        notes: body.notes ?? null,
      },
    });
    return NextResponse.json(animal, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
