"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function AuthHashHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        console.error("[AuthHashHandler] Missing Supabase env vars");
        window.location.replace("/sign-in");
        return;
      }

      const client = createBrowserClient(url, key, {
        cookieOptions: { name: "sb-auth-token" },
      });

      // Parse hash params
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        console.error("[AuthHashHandler] Missing tokens in hash");
        window.location.replace("/sign-in");
        return;
      }

      client.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
        if (error || !data.session) {
          console.error("[AuthHashHandler] setSession failed:", error);
          window.location.replace("/sign-in");
        } else {
          console.log("[AuthHashHandler] Session set, redirecting to /dashboard");
          window.location.replace("/dashboard");
        }
      });
    }
  }, []);

  return null;
}
