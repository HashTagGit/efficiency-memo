"use client";

import { useEffect } from "react";

export function AuthHashHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      // GoTrue redirects magic links to the root URL with the token in the
      // hash fragment. Forward the hash to /auth/callback so the server
      // route (or its fallback HTML) can process it properly.
      window.location.replace("/auth/callback" + hash);
    }
  }, []);

  return null;
}
