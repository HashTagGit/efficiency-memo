import { describe, expect, it } from "vitest";
import { isChargerReminderDue } from "../charger-notifications";
import { selectLatestChargeEvent } from "../db-tauri";

describe("Charger notification timing", () => {
  it("requires an elapsed due time that is not currently snoozed", () => {
    const now = new Date("2030-01-02T08:00:00.000Z");
    expect(isChargerReminderDue("2030-01-01T08:00:00.000Z", null, now)).toBe(true);
    expect(isChargerReminderDue("2030-01-03T08:00:00.000Z", null, now)).toBe(false);
    expect(isChargerReminderDue(
      "2030-01-01T08:00:00.000Z",
      "2030-01-02T09:00:00.000Z",
      now,
    )).toBe(false);
  });
});

describe("Full charge baseline", () => {
  it("keeps the newest event when an older full charge is added later", () => {
    const newer = {
      id: "newer", device_id: "device-1", charged_at: "2030-01-02T08:00:00.000Z",
      notes: null, created_at: "2030-01-02T08:00:00.000Z",
    };
    const older = {
      id: "older", device_id: "device-1", charged_at: "2030-01-01T08:00:00.000Z",
      notes: null, created_at: "2030-01-03T08:00:00.000Z",
    };
    expect(selectLatestChargeEvent(older, newer).id).toBe("newer");
    expect(selectLatestChargeEvent(newer, older).id).toBe("newer");
  });
});
