import { NextResponse } from "next/server";
import { requireUser, handleApiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({
      id: user.sub,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
