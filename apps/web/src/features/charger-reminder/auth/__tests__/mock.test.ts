import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MOCK_AUTH_COOKIE,
  isMockAuthEnabled,
  buildMockMagicLink,
  getMockAuthCookieOptions,
} from "../mock";

describe("mock auth utilities", () => {
  describe("isMockAuthEnabled", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      vi.resetModules();
      delete process.env.NEXT_PUBLIC_ENABLE_AUTH_MOCK;
      delete process.env.AUTH_E2E_MOCK;
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      delete process.env.NEXT_PUBLIC_ENABLE_AUTH_MOCK;
      delete process.env.AUTH_E2E_MOCK;
    });

    it("returns false in production", () => {
      process.env.NODE_ENV = "production";
      expect(isMockAuthEnabled()).toBe(false);
    });

    it("returns true when NEXT_PUBLIC_ENABLE_AUTH_MOCK=true in dev", () => {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_ENABLE_AUTH_MOCK = "true";
      expect(isMockAuthEnabled()).toBe(true);
    });
  });

  describe("buildMockMagicLink", () => {
    it("generates correct URL with email and next path", () => {
      const result = buildMockMagicLink("test@example.com", "/dashboard");
      expect(result).toBe(
        "/auth/callback?mock_session=1&email=test%40example.com&next=%2Fdashboard"
      );
    });

    it("encodes special characters in email", () => {
      const result = buildMockMagicLink("user+tag@example.com", "/settings");
      expect(result).toContain("email=user%2Btag%40example.com");
    });
  });

  describe("getMockAuthCookieOptions", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it("returns correct options for dev (non-production)", () => {
      process.env.NODE_ENV = "development";
      const options = getMockAuthCookieOptions();
      expect(options.httpOnly).toBe(true);
      expect(options.maxAge).toBe(60 * 60 * 24 * 7);
      expect(options.path).toBe("/");
      expect(options.sameSite).toBe("lax");
      expect(options.secure).toBe(false);
    });

    it("returns secure=true for production", () => {
      process.env.NODE_ENV = "production";
      const options = getMockAuthCookieOptions();
      expect(options.secure).toBe(true);
    });
  });

  describe("MOCK_AUTH_COOKIE", () => {
    it("has expected cookie name", () => {
      expect(MOCK_AUTH_COOKIE).toBe("efficiency-memo-mock-auth");
    });
  });
});