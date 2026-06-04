import { describe, expect, it, vi } from "vitest";

import { createSupabaseProxyClient } from "../proxy";

// Mock the env module
vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(() => ({
    supabaseUrl: "https://demo.supabase.co",
    supabaseAnonKey: "test-anon-key",
  })),
}));

describe("supabase proxy client", () => {
  it("creates a proxy client without crashing", () => {
    const mockRequest = {
      cookies: {
        getAll: vi.fn(() => []),
        set: vi.fn(),
      },
    } as unknown as import("next/server").NextRequest;

    const { supabase, getResponse } = createSupabaseProxyClient(mockRequest);
    expect(supabase).toBeDefined();
    expect(getResponse).toBeDefined();
    expect(typeof getResponse).toBe("function");
  });

  it("returns a response object from getResponse", () => {
    const mockRequest = {
      cookies: {
        getAll: vi.fn(() => []),
        set: vi.fn(),
      },
    } as unknown as import("next/server").NextRequest;

    const { getResponse } = createSupabaseProxyClient(mockRequest);
    const response = getResponse();
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
});