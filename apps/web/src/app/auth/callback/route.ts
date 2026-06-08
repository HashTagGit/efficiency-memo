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
  // Use SITE_URL env var (set in Docker) so redirects point to the
  // browser-facing origin (localhost:3000), not the container-internal
  // bind address (0.0.0.0:3000) which browsers cannot access.
  const siteUrl = process.env.SITE_URL || request.url;
  const redirectUrl = new URL(nextPath, siteUrl);

  // Handle mock auth for E2E testing
  if (isMockAuthEnabled() && searchParams.get("mock_session") === "1") {
    const response = NextResponse.redirect(redirectUrl);
    const email = normalizeAuthEmail(searchParams.get("email")) ?? "test@example.com";

    response.cookies.set(MOCK_AUTH_COOKIE, email, getMockAuthCookieOptions());

    return response;
  }

  // Default redirect path
  const redirectTo = redirectUrl;
  const errorUrl = new URL("/sign-in", siteUrl);
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

  // If no code/token_hash, the auth token may be in the URL hash fragment
  // (magic link flow with implicit grant). Browsers don't send hash to server,
  // so we return a small HTML page that preserves the hash when redirecting.
  // The destination page's Supabase client (detectSessionInUrl: true) will
  // automatically pick up the token from the hash and establish the session.
  if (!code && !tokenHash) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authenticating...</title>
</head>
<body>
  <p>Authenticating...</p>
  <script>
    // Preserve the hash fragment (access_token) when redirecting.
    // The destination page's Supabase client will detect it automatically.
    var hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      window.location.replace('${redirectTo.toString()}' + hash);
    } else {
      window.location.replace('${errorUrl.toString()}');
    }
  </script>
</body>
</html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  return NextResponse.redirect(errorUrl);
}
