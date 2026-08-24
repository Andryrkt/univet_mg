import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/api-helpers";

async function collectDescendantIds(rootId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = await prisma.category.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((c) => c.id);
    for (const id of frontier) ids.add(id);
  }
  return ids;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();
    const parentId: string | null = body.parentId ?? null;

    if (parentId) {
      if (parentId === params.id) {
        throw new ApiError(400, "Une catégorie ne peut pas être son propre parent");
      }
      const descendants = await collectDescendantIds(params.id);
      if (descendants.has(parentId)) {
        throw new ApiError(400, "Impossible de déplacer une catégorie sous l'une de ses propres sous-catégories");
      }
    }

    if (typeof body.code !== "string" || !/^[A-Za-z]{3}$/.test(body.code)) {
      throw new ApiError(400, "code doit contenir exactement 3 lettres");
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: { name: body.name, code: body.code.toUpperCase(), description: body.description ?? null, parentId },
    });
    return NextResponse.json(category);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
