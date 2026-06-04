import { describe, it, expect, beforeEach } from "vitest";
import { getToolList, getActiveTool } from "../tool-navigation";
import { registerTool, clearRegistry } from "@/lib/tool-registry/registry";
import type { ToolManifest } from "@memo/shared";

const mockManifestA: ToolManifest = {
  id: "tool-a",
  name: "Tool A",
  icon: "icon-a",
  description: "Desc A",
  routes: ["/tools/tool-a"],
  enabled: true,
};

const mockManifestB: ToolManifest = {
  id: "tool-b",
  name: "Tool B",
  icon: "icon-b",
  description: "Desc B",
  routes: ["/tools/tool-b", "/tools/tool-b/settings"],
  enabled: true,
};

const mockManifestDisabled: ToolManifest = {
  id: "tool-disabled",
  name: "Disabled Tool",
  icon: "icon-disabled",
  description: "Disabled",
  routes: ["/tools/disabled"],
  enabled: false,
};

const mockLoader = () => Promise.resolve({ default: () => null });

describe("tool-navigation", () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe("getToolList", () => {
    it("returns an empty array when no tools are registered", () => {
      const tools = getToolList();
      expect(tools).toEqual([]);
    });

    it("returns registered enabled tools as ToolManifest", () => {
      registerTool(mockManifestA, mockLoader);

      const tools = getToolList();

      expect(tools).toHaveLength(1);
      expect(tools[0].id).toBe("tool-a");
      expect(tools[0].name).toBe("Tool A");
      expect(tools[0].icon).toBe("icon-a");
      expect(tools[0].routes).toEqual(["/tools/tool-a"]);
      expect(tools[0].enabled).toBe(true);
    });

    it("filters out disabled tools", () => {
      registerTool(mockManifestA, mockLoader);
      registerTool(mockManifestDisabled, mockLoader);

      const tools = getToolList();

      expect(tools).toHaveLength(1);
      expect(tools[0].id).toBe("tool-a");
    });

    it("returns multiple enabled tools", () => {
      registerTool(mockManifestA, mockLoader);
      registerTool(mockManifestB, mockLoader);

      const tools = getToolList();

      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.id)).toContain("tool-a");
      expect(tools.map((t) => t.id)).toContain("tool-b");
    });

    it("does not include componentLoader in returned objects", () => {
      registerTool(mockManifestA, mockLoader);

      const tools = getToolList();

      expect(tools[0]).not.toHaveProperty("componentLoader");
    });
  });

  describe("getActiveTool", () => {
    it("returns empty string when no tools are registered", () => {
      const active = getActiveTool("/tools/tool-a");
      expect(active).toBe("");
    });

    it("returns tool id for exact route match", () => {
      registerTool(mockManifestA, mockLoader);

      const active = getActiveTool("/tools/tool-a");
      expect(active).toBe("tool-a");
    });

    it("returns tool id for prefix route match", () => {
      registerTool(mockManifestA, mockLoader);

      const active = getActiveTool("/tools/tool-a/devices");
      expect(active).toBe("tool-a");
    });

    it("returns empty string for non-matching path", () => {
      registerTool(mockManifestA, mockLoader);

      const active = getActiveTool("/dashboard");
      expect(active).toBe("");
    });

    it("matches the correct tool among multiple tools", () => {
      registerTool(mockManifestA, mockLoader);
      registerTool(mockManifestB, mockLoader);

      expect(getActiveTool("/tools/tool-a")).toBe("tool-a");
      expect(getActiveTool("/tools/tool-b")).toBe("tool-b");
      expect(getActiveTool("/tools/tool-b/settings")).toBe("tool-b");
    });

    it("does not match disabled tools", () => {
      registerTool(mockManifestDisabled, mockLoader);

      const active = getActiveTool("/tools/disabled");
      expect(active).toBe("");
    });

    it("handles paths without leading slash", () => {
      registerTool(mockManifestA, mockLoader);

      const active = getActiveTool("tools/tool-a");
      expect(active).toBe("tool-a");
    });

    it("handles routes without leading slash", () => {
      const manifest: ToolManifest = {
        id: "tool-c",
        name: "Tool C",
        icon: "icon-c",
        description: "Desc C",
        routes: ["tools/tool-c"],
        enabled: true,
      };
      registerTool(manifest, mockLoader);

      const active = getActiveTool("/tools/tool-c");
      expect(active).toBe("tool-c");
    });
  });
});
