"use client";

import { signOutAction } from "@/lib/auth/actions";

export function SignOutForm() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-foreground hover:border-accent/35 hover:bg-white/10"
      >
        Sign out
      </button>
    </form>
  );
}
