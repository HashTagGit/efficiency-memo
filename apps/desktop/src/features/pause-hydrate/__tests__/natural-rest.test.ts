import { describe, expect, it } from "vitest";
import { observeIdleForNaturalRest } from "../natural-rest";

describe("natural rest observation", () => {
  it("requires observed activity before an idle stretch can complete a break", () => {
    expect(observeIdleForNaturalRest(false, 600)).toMatchObject({
      available: true,
      armed: false,
      shouldAttempt: false,
    });
    const active = observeIdleForNaturalRest(false, 10);
    expect(active).toMatchObject({ armed: true, shouldAttempt: false });
    expect(observeIdleForNaturalRest(active.armed, 300)).toMatchObject({
      armed: true,
      shouldAttempt: true,
    });
    expect(observeIdleForNaturalRest(true, null)).toMatchObject({
      available: false,
      armed: false,
      shouldAttempt: false,
    });
  });
});
