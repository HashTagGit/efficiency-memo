"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  MOCK_AUTH_COOKIE,
  getMockAuthCookieOptions,
  isMockAuthEnabled,
} from "@/features/charger-reminder/auth/mock";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const cookieStore = await cookies();

  if (isMockAuthEnabled()) {
    cookieStore.set(MOCK_AUTH_COOKIE, "", {
      ...getMockAuthCookieOptions(),
      maxAge: 0,
    });
  }

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore errors - still redirect to sign-in
  }

  redirect("/sign-in");
}
