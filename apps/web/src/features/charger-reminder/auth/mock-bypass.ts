"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  MOCK_AUTH_COOKIE,
  getMockAuthCookieOptions,
  isMockAuthEnabled,
} from "@/features/charger-reminder/auth/mock";

export async function mockBypassAction(formData: FormData) {
  if (!isMockAuthEnabled()) {
    redirect("/sign-in");
  }

  const email = formData.get("email") as string | null;
  const nextPath = formData.get("next") as string | null || "/dashboard";

  if (!email) {
    redirect("/sign-in");
  }

  const cookieStore = await cookies();

  cookieStore.set(MOCK_AUTH_COOKIE, email.toLowerCase().trim(), {
    ...getMockAuthCookieOptions(),
  });

  redirect(nextPath);
}