import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
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
  console.error(error);
  return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
}
