import { describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "../server";

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

describe("supabase server client", () => {
  it("creates a server client without crashing", async () => {
    const client = await createSupabaseServerClient();
    expect(client).toBeDefined();
  });
});