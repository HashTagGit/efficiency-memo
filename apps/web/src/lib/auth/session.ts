import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  MOCK_AUTH_COOKIE,
  isMockAuthEnabled,
  normalizeAuthEmail,
} from "@/features/charger-reminder/auth/mock";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();

  if (isMockAuthEnabled()) {
    const mockEmail = normalizeAuthEmail(
      cookieStore.get(MOCK_AUTH_COOKIE)?.value,
    );

    if (mockEmail) {
      return { id: "mock-user-id", email: mockEmail };
    }
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return null;
    }

    return { id: user.id, email: user.email };
  } catch {
    // If Supabase env is missing or error occurs, return null
    return null;
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}
