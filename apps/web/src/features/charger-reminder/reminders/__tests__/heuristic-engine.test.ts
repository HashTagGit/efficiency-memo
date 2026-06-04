import { describe, expect, it } from "vitest";

import {
  REMINDER_HEURISTIC_VERSION,
  computeDeterministicReminderState,
} from "@/features/charger-reminder/reminders/heuristic-engine";

describe("computeDeterministicReminderState", () => {
  it("returns a stable snapshot for a known-capacity device", () => {
    expect(
      computeDeterministicReminderState({
        device_type: "wireless-mouse",
        capacity_mah: 2000,
        threshold_percent: 20,
        notify_before_days: 5,
        last_full_charge_at: "2026-04-01T00:00:00.000Z",
        computed_at: "2026-04-09T00:00:00.000Z",
      }),
    ).toEqual({
      heuristic_version: REMINDER_HEURISTIC_VERSION,
      estimated_battery_percent: 97.73,
      estimated_days_until_threshold: 275,
      reminder_due_at: "2027-01-03T08:28:14.117Z",
      status: "tracking",
      basis:
        "Heuristic deterministic-v1: Wireless Mouse preset 8.50%/month, capacity factor 1.00 (2000mAh), correction factor 1.00, effective drain 8.50%/month, elapsed 8.00d, threshold 20%, lead 5d.",
    });
  });

  it("falls back to preset-only capacity assumptions for unknown capacity", () => {
    expect(
      computeDeterministicReminderState({
        device_type: "game-controller",
        capacity_mah: null,
        threshold_percent: 30,
        notify_before_days: 10,
        last_full_charge_at: "2026-04-01T00:00:00.000Z",
        computed_at: "2026-07-18T00:00:00.000Z",
      }),
    ).toEqual({
      heuristic_version: REMINDER_HEURISTIC_VERSION,
      estimated_battery_percent: 35.2,
      estimated_days_until_threshold: 9,
      reminder_due_at: "2026-07-16T16:00:00.000Z",
      status: "remind",
      basis:
        "Heuristic deterministic-v1: Game Controller preset 18.00%/month, capacity factor 1.00 (preset-only), correction factor 1.00, effective drain 18.00%/month, elapsed 108.00d, threshold 30%, lead 10d.",
    });
  });

  it.each([
    {
      name: "threshold 100% becomes immediately due",
      input: {
        device_type: "power-bank" as const,
        capacity_mah: null,
        threshold_percent: 100,
        notify_before_days: 0,
        last_full_charge_at: "2026-04-01T00:00:00.000Z",
        computed_at: "2026-04-01T00:00:00.000Z",
      },
      expected: {
        heuristic_version: REMINDER_HEURISTIC_VERSION,
        estimated_battery_percent: 100,
        estimated_days_until_threshold: 0,
        reminder_due_at: "2026-04-01T00:00:00.000Z",
        status: "charge-now",
        basis:
          "Heuristic deterministic-v1: Power Bank preset 4.00%/month, capacity factor 1.00 (preset-only), correction factor 1.00, effective drain 4.00%/month, elapsed 0.00d, threshold 100%, lead 0d.",
      },
    },
    {
      name: "threshold 0% waits until fully depleted",
      input: {
        device_type: "power-bank" as const,
        capacity_mah: null,
        threshold_percent: 0,
        notify_before_days: 14,
        last_full_charge_at: "2026-04-01T00:00:00.000Z",
        computed_at: "2026-05-01T00:00:00.000Z",
      },
      expected: {
        heuristic_version: REMINDER_HEURISTIC_VERSION,
        estimated_battery_percent: 96,
        estimated_days_until_threshold: 720,
        reminder_due_at: "2028-04-06T00:00:00.000Z",
        status: "tracking",
        basis:
          "Heuristic deterministic-v1: Power Bank preset 4.00%/month, capacity factor 1.00 (preset-only), correction factor 1.00, effective drain 4.00%/month, elapsed 30.00d, threshold 0%, lead 14d.",
      },
    },
  ])("handles edge threshold values: $name", ({ input, expected }) => {
    expect(computeDeterministicReminderState(input)).toEqual(expected);
  });
});
