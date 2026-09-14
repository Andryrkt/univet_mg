import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError } from "@/lib/api-helpers";

export async function PATCH(request: Request) {
  try {
    const authUser = await requireUser(request);
    const user = await prisma.user.update({
      where: { id: authUser.sub },
      data: { onboardingCompletedAt: new Date() },
      select: { id: true, email: true, name: true, role: true, onboardingCompletedAt: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}
