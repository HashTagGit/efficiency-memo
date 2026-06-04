import { describe, it, expect } from "vitest";
import { getToolById } from "@/lib/tool-registry/registry";

// Import the feature module which triggers registerTool on module evaluation
import "@/features/core-hour";

describe("CoreHour registration", () => {
  it("registers core-hour in the registry after import", () => {
    const tool = getToolById("core-hour");

    expect(tool).toBeDefined();
    expect(tool?.id).toBe("core-hour");
    expect(tool?.name).toBe("CoreHour");
    expect(tool?.enabled).toBe(true);
  });

  it("core-hour has correct manifest fields", () => {
    const tool = getToolById("core-hour");

    expect(tool?.icon).toBe("clock");
    expect(tool?.description).toBe(
      "Track how you spend your time with periodic check-ins and tag-based categorization",
    );
    expect(tool?.routes).toContain("/tools/core-hour");
    expect(tool?.routes).toContain("/tools/core-hour/history");
    expect(tool?.routes).toContain("/tools/core-hour/tags");
    expect(tool?.routes).toContain("/tools/core-hour/settings");
  });

  it("core-hour has a componentLoader", () => {
    const tool = getToolById("core-hour");

    expect(tool?.componentLoader).toBeDefined();
    expect(typeof tool?.componentLoader).toBe("function");
  });

  it("componentLoader returns a valid component", async () => {
    const tool = getToolById("core-hour");
    const component = await tool?.componentLoader?.();

    expect(component?.default).toBeDefined();
    expect(typeof component?.default).toBe("function");
  });
});
