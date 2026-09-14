import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const dbUser = await prisma.user.findUnique({
      where: { id: user.sub },
      select: { onboardingCompletedAt: true },
    });
    return NextResponse.json({
      id: user.sub,
      email: user.email,
      name: user.name,
      role: user.role,
      onboardingCompletedAt: dbUser?.onboardingCompletedAt ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
