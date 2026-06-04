import { describe, it, expect, afterEach } from "vitest";
import { getEnv } from "../env";

const SUPABASE_URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

describe("env validation", () => {
  afterEach(() => {
    delete process.env[SUPABASE_URL_KEY];
    delete process.env[SUPABASE_ANON_KEY];
  });

  it("throws descriptive error when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    process.env[SUPABASE_ANON_KEY] = "test-key";

    expect(() => getEnv()).toThrow(SUPABASE_URL_KEY);
  });

  it("throws descriptive error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
    process.env[SUPABASE_URL_KEY] = "https://test.supabase.co";

    expect(() => getEnv()).toThrow(SUPABASE_ANON_KEY);
  });

  it("returns typed env object when all vars are present", () => {
    process.env[SUPABASE_URL_KEY] = "https://test.supabase.co";
    process.env[SUPABASE_ANON_KEY] = "test-anon-key";

    const env = getEnv();

    expect(env).toEqual({
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "test-anon-key",
    });
  });
});
