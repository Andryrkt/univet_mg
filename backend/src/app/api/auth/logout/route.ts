import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const cookie = sessionCookieOptions();
  response.cookies.set(cookie.name, "", { ...cookie, maxAge: 0 });
  return response;
}
