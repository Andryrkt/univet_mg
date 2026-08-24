import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";
import { hashPassword } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const body = await request.json();

    if (!body.email || !body.password || !body.name || !body.role) {
      return NextResponse.json({ error: "email, password, name et role sont requis" }, { status: 400 });
    }
    if (!["ADMIN", "MODERATOR", "SELLER"].includes(body.role)) {
      return NextResponse.json({ error: "role invalide" }, { status: 400 });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: { email: body.email, passwordHash, name: body.name, role: body.role },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
