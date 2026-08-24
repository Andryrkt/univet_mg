import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const clients = await prisma.client.findMany({
      include: { animals: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(clients);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    // ADMIN, MODERATOR et SELLER peuvent tous créer un client (nécessaire au point de vente)
    await requireUser(request);
    const body = await request.json();

    if (!body.name || !body.phone) {
      return NextResponse.json({ error: "name et phone sont requis" }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email ?? null,
        address: body.address ?? null,
      },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
