import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: "email et password requis" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  const response = NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const cookie = sessionCookieOptions();
  response.cookies.set(cookie.name, token, cookie);
  return response;
}
