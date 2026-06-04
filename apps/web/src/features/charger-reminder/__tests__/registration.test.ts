import { describe, it, expect } from "vitest";
import { getToolById } from "@/lib/tool-registry/registry";

// Import the feature module which triggers registerTool on module evaluation
import "@/features/charger-reminder";

describe("Charger Reminder registration", () => {
  it("registers charger-reminder in the registry after import", () => {
    const tool = getToolById("charger-reminder");

    expect(tool).toBeDefined();
    expect(tool?.id).toBe("charger-reminder");
    expect(tool?.name).toBe("Charger Reminder");
    expect(tool?.enabled).toBe(true);
  });

  it("charger-reminder has correct manifest fields", () => {
    const tool = getToolById("charger-reminder");

    expect(tool?.icon).toBe("battery");
    expect(tool?.description).toBe(
      "Track device batteries and get reminded to charge before they run out"
    );
    expect(tool?.routes).toContain("/tools/charger-reminder");
  });

  it("charger-reminder has a componentLoader", () => {
    const tool = getToolById("charger-reminder");

    expect(tool?.componentLoader).toBeDefined();
    expect(typeof tool?.componentLoader).toBe("function");
  });

  it("componentLoader returns a valid component", async () => {
    const tool = getToolById("charger-reminder");
    const component = await tool?.componentLoader?.();

    expect(component?.default).toBeDefined();
    expect(typeof component?.default).toBe("function");
  });
});