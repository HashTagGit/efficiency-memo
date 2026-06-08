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
  const siteUrl = process.env.SITE_URL || request.url;
  const redirectUrl = new URL(nextPath, siteUrl);

  // DEBUG: log what we received
  console.log("[AUTH CALLBACK] URL:", request.url);
  console.log("[AUTH CALLBACK] searchParams:", Object.fromEntries(searchParams.entries()));

  // Handle mock auth for E2E testing
  if (isMockAuthEnabled() && searchParams.get("mock_session") === "1") {
    const response = NextResponse.redirect(redirectUrl);
    const email = normalizeAuthEmail(searchParams.get("email")) ?? "test@example.com";

    response.cookies.set(MOCK_AUTH_COOKIE, email, getMockAuthCookieOptions());

    return response;
  }

  const redirectTo = redirectUrl;
  const errorUrl = new URL("/sign-in", siteUrl);
  errorUrl.searchParams.set("error", "auth");

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  console.log("[AUTH CALLBACK] code:", code, "tokenHash:", tokenHash, "type:", type);

  try {
    const supabase = await createSupabaseServerClient();

    if (code) {
      console.log("[AUTH CALLBACK] Exchanging code for session...");
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      console.log("[AUTH CALLBACK] exchangeCodeForSession result:", error ? "ERROR: " + error.message : "SUCCESS");
      if (!error) {
        return NextResponse.redirect(redirectTo);
      }
    }

    if (tokenHash && type) {
      console.log("[AUTH CALLBACK] Verifying OTP...");
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      console.log("[AUTH CALLBACK] verifyOtp result:", error ? "ERROR: " + error.message : "SUCCESS");
      if (!error) {
        return NextResponse.redirect(redirectTo);
      }
    }
  } catch (err) {
    console.error("[AUTH CALLBACK] EXCEPTION:", err);
    return NextResponse.redirect(errorUrl);
  }

  console.log("[AUTH CALLBACK] No code/tokenHash — returning HTML page for hash-based auth");

  if (!code && !tokenHash) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authenticating...</title>
</head>
<body>
  <p>Authenticating...</p>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.106.2/dist/umd/supabase.min.js"></script>
  <script>
    (async function() {
      try {
        var client = supabase.createClient('${supabaseUrl}', '${supabaseKey}');
        var { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (data.session) {
          window.location.replace('${redirectTo.toString()}');
        } else {
          window.location.replace('${errorUrl.toString()}');
        }
      } catch (e) {
        console.error("Auth callback error:", e);
        window.location.replace('${errorUrl.toString()}');
      }
    })();
  </script>
</body>
</html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  console.log("[AUTH CALLBACK] Fallback to error URL");
  return NextResponse.redirect(errorUrl);
}
