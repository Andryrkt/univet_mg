import { NextResponse } from "next/server";
import { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResponse } from "@/lib/pagination";

const typeLabel: Record<StockMovementType, string> = {
  PURCHASE_RECEPTION: "réception fournisseur",
  SALE: "vente",
  ADJUSTMENT: "ajustement",
  TRANSFER_OUT: "transfert (sortie)",
  TRANSFER_IN: "transfert (entrée)",
  SALE_CANCELLATION: "annulation de vente",
};

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") ?? undefined;
    const locationId = searchParams.get("locationId") ?? undefined;
    const search = searchParams.get("search")?.trim();
    const pagination = parsePagination(searchParams);

    const matchingTypes = search
      ? (Object.keys(typeLabel) as StockMovementType[]).filter((t) => typeLabel[t].includes(search.toLowerCase()))
      : [];

    const where: Prisma.StockMovementWhereInput = {
      productId,
      locationId,
      ...(search
        ? {
            OR: [
              { product: { name: { contains: search, mode: "insensitive" } } },
              { location: { name: { contains: search, mode: "insensitive" } } },
              { createdBy: { name: { contains: search, mode: "insensitive" } } },
              ...(matchingTypes.length ? [{ type: { in: matchingTypes } }] : []),
            ],
          }
        : {}),
    };

    const include = {
      product: true,
      location: true,
      createdBy: { select: { id: true, name: true } },
    };

    if (pagination) {
      const [items, total] = await Promise.all([
        prisma.stockMovement.findMany({ where, include, orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take }),
        prisma.stockMovement.count({ where }),
      ]);
      return NextResponse.json(paginatedResponse(items, total, pagination));
    }

    const movements = await prisma.stockMovement.findMany({ where, include, orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json(movements);
  } catch (error) {
    return handleApiError(error);
  }
}
