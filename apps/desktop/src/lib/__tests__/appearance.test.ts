import { describe, expect, it } from "vitest";
import {
  DEFAULT_PALETTE,
  readPalette,
  readThemeMode,
  resolveTheme,
} from "../appearance";

describe("appearance preferences", () => {
  it("resolves explicit and system theme modes", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("reads stored modes and falls back to the legacy theme", () => {
    expect(readThemeMode("system", "dark")).toBe("system");
    expect(readThemeMode(null, "light")).toBe("light");
    expect(readThemeMode("invalid", null)).toBe("system");
  });

  it("accepts known palettes and defaults unknown values", () => {
    expect(readPalette("grove")).toBe("grove");
    expect(readPalette("clarity")).toBe("clarity");
    expect(readPalette("canopy")).toBe("canopy");
    expect(readPalette("unknown")).toBe(DEFAULT_PALETTE);
  });
});
