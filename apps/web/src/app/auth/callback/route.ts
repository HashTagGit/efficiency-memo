import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import {
  MOCK_AUTH_COOKIE,
  getMockAuthCookieOptions,
  isMockAuthEnabled,
  normalizeAuthEmail,
} from "@/features/charger-reminder/auth/mock";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nextPath = searchParams.get("next") || "/dashboard";
  const redirectUrl = new URL(nextPath, request.url);

  // Handle mock auth for E2E testing
  if (isMockAuthEnabled() && searchParams.get("mock_session") === "1") {
    const response = NextResponse.redirect(redirectUrl);
    const email = normalizeAuthEmail(searchParams.get("email")) ?? "test@example.com";

    response.cookies.set(MOCK_AUTH_COOKIE, email, getMockAuthCookieOptions());

    return response;
  }

  // Default redirect path
  const redirectTo = redirectUrl;
  const errorUrl = new URL("/sign-in", request.url);
  errorUrl.searchParams.set("error", "auth");

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  try {
    const supabase = await createSupabaseServerClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(redirectTo);
      }
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (!error) {
        return NextResponse.redirect(redirectTo);
      }
    }
  } catch {
    // If Supabase env is missing or error occurs, redirect to error page
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(errorUrl);
}
