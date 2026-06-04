import { NextRequest, NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE,
  getMockAuthCookieOptions,
  isMockAuthEnabled,
} from "@/features/charger-reminder/auth/mock";

export async function GET(request: NextRequest) {
  if (!isMockAuthEnabled()) {
    return NextResponse.json({ error: "Mock auth not enabled" }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get("email");
  const nextPath = searchParams.get("next") || "/dashboard";

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));

  response.cookies.set(MOCK_AUTH_COOKIE, email.toLowerCase().trim(), {
    ...getMockAuthCookieOptions(),
  });

  return response;
}