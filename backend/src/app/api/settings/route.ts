import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";

const SETTINGS_ID = "singleton";

async function getOrCreateSettings() {
  const existing = await prisma.clinicSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  return prisma.clinicSettings.create({ data: { id: SETTINGS_ID } });
}

// Public (pas d'authentification requise) : la page de connexion affiche
// le nom du cabinet avant que l'utilisateur ne soit connecté.
export async function GET() {
  try {
    const settings = await getOrCreateSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "name est requis" }, { status: 400 });
    }

    const expiryAlertDays = Number(body.expiryAlertDays);
    const slowMovingDays = Number(body.slowMovingDays);

    const data = {
      name: body.name,
      tagline: body.tagline || null,
      address: body.address || null,
      phone: body.phone || null,
      email: body.email || null,
      expiryAlertDays: Number.isFinite(expiryAlertDays) && expiryAlertDays > 0 ? expiryAlertDays : 90,
      slowMovingDays: Number.isFinite(slowMovingDays) && slowMovingDays > 0 ? slowMovingDays : 30,
    };

    const settings = await prisma.clinicSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });
    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
