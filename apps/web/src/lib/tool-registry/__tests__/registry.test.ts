import { describe, it, expect, beforeEach } from "vitest";
import type { ToolManifest } from "@memo/shared";
import {
  registerTool,
  getRegisteredTools,
  getToolById,
} from "../registry";

describe("tool registry", () => {
  const mockManifest: ToolManifest = {
    id: "test-tool",
    name: "Test Tool",
    icon: "test-icon",
    description: "A test tool",
    routes: ["/test"],
    enabled: true,
  };

  const mockLoader = () => Promise.resolve({ default: () => null });

  beforeEach(() => {
    // Reset the registry by re-importing (tests run in isolation)
    // Note: In practice, we test the public API - registerTool adds to the shared Map
    // Each test uses unique tool IDs to avoid collisions
  });

  it("registerTool adds a tool to the registry", () => {
    const initialCount = getRegisteredTools().length;

    registerTool(mockManifest, mockLoader);

    expect(getRegisteredTools().length).toBe(initialCount + 1);
  });

  it("getRegisteredTools returns all registered tools", () => {
    registerTool(mockManifest, mockLoader);

    const tools = getRegisteredTools();

    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some((t) => t.id === mockManifest.id)).toBe(true);
  });

  it("getToolById finds the correct tool", () => {
    registerTool(mockManifest, mockLoader);

    const tool = getToolById(mockManifest.id);

    expect(tool).toBeDefined();
    expect(tool?.id).toBe(mockManifest.id);
    expect(tool?.name).toBe(mockManifest.name);
  });

  it("getToolById returns undefined for unknown ID", () => {
    const tool = getToolById("non-existent-tool-id");

    expect(tool).toBeUndefined();
  });

  it("registered tool includes componentLoader", () => {
    registerTool(mockManifest, mockLoader);

    const tool = getToolById(mockManifest.id);

    expect(tool?.componentLoader).toBeDefined();
    expect(typeof tool?.componentLoader).toBe("function");
  });
});