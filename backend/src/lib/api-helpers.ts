import { NextResponse } from "next/server";
import { Prisma, type Role } from "@prisma/client";
import { getAuthUser, hasRole, type AuthPayload } from "@/lib/auth";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(request: Request): Promise<AuthPayload> {
  const user = await getAuthUser(request);
  if (!user) throw new ApiError(401, "Authentification requise");
  return user;
}

export async function requireRole(request: Request, roles: Role[]): Promise<AuthPayload> {
  const user = await requireUser(request);
  if (!hasRole(user, roles)) throw new ApiError(403, "Accès refusé");
  return user;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Impossible : d'autres éléments dépendent encore de cette ressource" },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Ressource introuvable" }, { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Cette valeur existe déjà" }, { status: 409 });
    }
  }
  console.error(error);
  return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
}
