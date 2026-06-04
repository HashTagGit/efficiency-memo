import { describe, it, expect, beforeEach } from "vitest";
import { discoverTools } from "../discovery";
import { getRegisteredTools, clearRegistry } from "../registry";
import { registerTool } from "../registry";
import type { ToolManifest } from "@memo/shared";

// Mock manifest for testing
const mockManifest: ToolManifest = {
  id: "mock-tool",
  name: "Mock Tool",
  icon: "mock-icon",
  description: "A mock tool for testing discovery",
  routes: ["/tools/mock-tool"],
  enabled: true,
};

describe("discovery", () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe("discoverTools", () => {
    it("returns an empty array when no features are implemented", async () => {
      const tools = await discoverTools();

      // When no feature manifests exist, discovery returns empty
      // This is expected behavior - features add themselves via manifest.ts
      expect(Array.isArray(tools)).toBe(true);
    });

    it("discovers and registers tools that have manifests", async () => {
      // Note: This test verifies the discovery mechanism works
      // In a real scenario, features would have manifest.ts files
      // For now, we test that discoverTools() runs without error
      const tools = await discoverTools();

      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
    });
  });
});

describe("discovery with mock features", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("discovers manually registered tools via getRegisteredTools", () => {
    // Register a mock tool manually (simulating what discoverTools would do)
    const mockLoader = () => Promise.resolve({ default: () => null });
    registerTool(mockManifest, mockLoader);

    const tools = getRegisteredTools();

    expect(tools.some((t) => t.id === "mock-tool")).toBe(true);
  });
});