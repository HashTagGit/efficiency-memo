import { describe, it, expect, afterEach } from "vitest";
import { generateToolRoutes, getToolRoutePath } from "../routes";
import { registerTool, clearRegistry } from "../registry";
import type { ToolManifest } from "@memo/shared";

describe("routes", () => {
  afterEach(() => {
    clearRegistry();
  });

  describe("generateToolRoutes", () => {
    it("generates routes from registered tools", () => {
      const manifest: ToolManifest = {
        id: "test-tool",
        name: "Test Tool",
        icon: "test-icon",
        description: "A test tool",
        routes: ["/tools/test-tool"],
        enabled: true,
      };

      const mockLoader = () => Promise.resolve({ default: () => null });
      registerTool(manifest, mockLoader);

      const routes = generateToolRoutes();

      expect(routes.length).toBeGreaterThan(0);
      expect(routes[0].path).toBe("/tools/test-tool");
    });

    it("skips disabled tools", () => {
      const manifest: ToolManifest = {
        id: "disabled-tool",
        name: "Disabled Tool",
        icon: "icon",
        description: "A disabled tool",
        routes: ["/tools/disabled"],
        enabled: false,
      };

      const mockLoader = () => Promise.resolve({ default: () => null });
      registerTool(manifest, mockLoader);

      const routes = generateToolRoutes();

      expect(routes.some((r) => r.path === "/tools/disabled")).toBe(false);
    });
  });

  describe("getToolRoutePath", () => {
    it("returns the first route for a registered tool", () => {
      const manifest: ToolManifest = {
        id: "route-tool",
        name: "Route Tool",
        icon: "icon",
        description: "A route tool",
        routes: ["/tools/route-tool", "/tools/alt-route"],
        enabled: true,
      };

      const mockLoader = () => Promise.resolve({ default: () => null });
      registerTool(manifest, mockLoader);

      const routePath = getToolRoutePath("route-tool");

      expect(routePath).toBe("/tools/route-tool");
    });

    it("returns undefined for unknown tool", () => {
      const routePath = getToolRoutePath("non-existent-tool");

      expect(routePath).toBeUndefined();
    });
  });
});