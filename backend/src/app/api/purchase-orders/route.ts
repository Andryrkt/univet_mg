import { NextResponse } from "next/server";
import { Prisma, PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResponse } from "@/lib/pagination";

const statusLabel: Record<PurchaseOrderStatus, string> = {
  PENDING: "en attente",
  PARTIALLY_RECEIVED: "partiellement reçue",
  RECEIVED: "reçue",
  CANCELLED: "annulée",
};

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN", "MODERATOR"]);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const pagination = parsePagination(searchParams);

    const matchingStatuses = search
      ? (Object.keys(statusLabel) as PurchaseOrderStatus[]).filter((s) => statusLabel[s].includes(search.toLowerCase()))
      : [];

    const where: Prisma.PurchaseOrderWhereInput = search
      ? {
          OR: [
            { supplier: { name: { contains: search, mode: "insensitive" } } },
            { location: { name: { contains: search, mode: "insensitive" } } },
            ...(matchingStatuses.length ? [{ status: { in: matchingStatuses } }] : []),
          ],
        }
      : {};

    const include = {
      supplier: true,
      location: true,
      createdBy: { select: { id: true, name: true } },
      items: { include: { product: { include: { unit: true } } } },
    };

    if (pagination) {
      const [items, total] = await Promise.all([
        prisma.purchaseOrder.findMany({ where, include, orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take }),
        prisma.purchaseOrder.count({ where }),
      ]);
      return NextResponse.json(paginatedResponse(items, total, pagination));
    }

    const orders = await prisma.purchaseOrder.findMany({ where, include, orderBy: { createdAt: "desc" } });
    return NextResponse.json(orders);
  } catch (error) {
    return handleApiError(error);
  }
}

type PurchaseOrderItemInput = {
  productId: string;
  quantityOrdered: number;
  unitPrice: number;
};

export async function POST(request: Request) {
  try {
    const user = await requireRole(request, ["ADMIN", "MODERATOR"]);
    const body = await request.json();
    const items = body.items as PurchaseOrderItemInput[] | undefined;

    if (!body.supplierId || !body.locationId || !items?.length) {
      return NextResponse.json({ error: "supplierId, locationId et items sont requis" }, { status: 400 });
    }

    for (const item of items) {
      if (!item.productId || !item.quantityOrdered || item.quantityOrdered <= 0 || item.unitPrice == null) {
        return NextResponse.json({ error: "Chaque ligne nécessite productId, quantityOrdered > 0 et unitPrice" }, { status: 400 });
      }
    }

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId: body.supplierId,
        locationId: body.locationId,
        createdById: user.sub,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: { supplier: true, location: true, items: { include: { product: { include: { unit: true } } } } },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
