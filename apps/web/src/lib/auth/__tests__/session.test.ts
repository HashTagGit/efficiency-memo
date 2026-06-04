import { describe, expect, it, vi } from "vitest";

import { getSessionUser, requireSessionUser } from "../session";

// Mock the env module
vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(() => ({
    supabaseUrl: "https://demo.supabase.co",
    supabaseAnonKey: "test-anon-key",
  })),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    }),
  ),
}));

// Mock next/navigation - redirect throws NavigationRedirect
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// Mock @/lib/supabase/server to avoid resolving issues in vitest
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      },
    }),
  ),
}));

describe("session", () => {
  describe("getSessionUser", () => {
    it("returns null when no cookies are present", async () => {
      const user = await getSessionUser();
      expect(user).toBeNull();
    });
  });

  describe("requireSessionUser", () => {
    it("redirects to /sign-in when unauthenticated", async () => {
      let threw = false;
      try {
        await requireSessionUser();
      } catch (e) {
        threw = true;
      }
      expect(threw).toBe(true);
    });
  });
});
