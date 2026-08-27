import { describe, expect, it } from "vitest";
import { resolveFocusAction } from "../desktop-companion-bridge";

describe("desktop companion focus commands", () => {
  it("keeps start/stop, pause/resume, and review semantics distinct", () => {
    expect(resolveFocusAction("start-stop-focus", {
      active: false, paused: false, reviewRequired: false,
    })).toBe("start-latest");
    expect(resolveFocusAction("start-stop-focus", {
      active: true, paused: false, reviewRequired: false,
    })).toBe("end");
    expect(resolveFocusAction("primary-focus", {
      active: true, paused: false, reviewRequired: false,
    })).toBe("pause");
    expect(resolveFocusAction("primary-focus", {
      active: true, paused: true, reviewRequired: false,
    })).toBe("resume");
    expect(resolveFocusAction("end-focus", {
      active: true, paused: false, reviewRequired: true,
    })).toBe("review");
  });
});
