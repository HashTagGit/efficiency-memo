import { describe, it, expect } from "vitest";
import type {
  DeviceRecord,
  ChargeEventRecord,
  DevicePresetRecord,
  ReminderPreferenceRecord,
  ComputedReminderStateRecord,
  CreateDeviceInput,
  UpdateDeviceInput,
  CreateChargeEventInput,
  UpsertReminderPreferenceInput,
  UpsertComputedReminderStateInput,
  DeviceWithChargeHistory,
  DevicePresetType,
} from "../contracts";
import {
  fixturesDevices,
  fixturesChargeEvents,
  fixturesDevicePresets,
  fixturesReminderPreferences,
  fixturesComputedReminderStates,
  fixtureDeviceWithHistory,
  createDeviceFixture,
  createChargeEventFixture,
  TEST_USER_ID,
  ALL_DEVICE_PRESET_TYPES,
} from "./fixtures";

describe("DeviceRecord type validation", () => {
  it("should accept valid device records from fixtures", () => {
    for (const device of fixturesDevices) {
      expect(device.id).toBeDefined();
      expect(device.user_id).toBe(TEST_USER_ID);
      expect(typeof device.name).toBe("string");
      expect(device.name.length).toBeGreaterThan(0);
      expect(ALL_DEVICE_PRESET_TYPES.includes(device.device_type)).toBe(true);
      expect(
        device.capacity_mah === null || device.capacity_mah > 0
      ).toBeTruthy();
      expect(
        device.notes === null || typeof device.notes === "string"
      ).toBeTruthy();
      expect(
        device.threshold_percent >= 0 && device.threshold_percent <= 100
      ).toBe(true);
      expect(device.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(device.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("should create device via factory function", () => {
    const device = createDeviceFixture({
      name: "Test Device",
      device_type: "bluetooth-headphones",
    });
    expect(device.name).toBe("Test Device");
    expect(device.device_type).toBe("bluetooth-headphones");
    expect(device.user_id).toBe(TEST_USER_ID);
  });
});

describe("ChargeEventRecord type validation", () => {
  it("should accept valid charge events from fixtures", () => {
    for (const event of fixturesChargeEvents) {
      expect(event.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(event.device_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(event.charged_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(
        event.notes === null || typeof event.notes === "string"
      ).toBeTruthy();
      expect(event.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("should create charge event via factory function", () => {
    const event = createChargeEventFixture("22222222-2222-2222-2222-222222222221", {
      notes: "Test note",
    });
    expect(event.device_id).toBe("22222222-2222-2222-2222-222222222221");
    expect(event.notes).toBe("Test note");
  });
});

describe("DevicePresetRecord type validation", () => {
  it("should contain all 5 preset types", () => {
    expect(fixturesDevicePresets).toHaveLength(5);
    const types = fixturesDevicePresets.map((p) => p.type);
    expect(types).toContain("wireless-mouse");
    expect(types).toContain("game-controller");
    expect(types).toContain("wireless-keyboard");
    expect(types).toContain("bluetooth-headphones");
    expect(types).toContain("power-bank");
  });

  it("should have valid thresholds (0-100)", () => {
    for (const preset of fixturesDevicePresets) {
      expect(
        preset.default_threshold >= 0 && preset.default_threshold <= 100
      ).toBe(true);
    }
  });

  it("should have positive drain rates", () => {
    for (const preset of fixturesDevicePresets) {
      expect(preset.estimated_drain_per_month).toBeGreaterThan(0);
    }
  });
});

describe("ReminderPreferenceRecord type validation", () => {
  it("should have non-negative notify_before_days", () => {
    for (const pref of fixturesReminderPreferences) {
      expect(pref.notify_before_days).toBeGreaterThanOrEqual(0);
    }
  });

  it("should have unique device_id per preference", () => {
    const deviceIds = fixturesReminderPreferences.map((p) => p.device_id);
    const uniqueIds = new Set(deviceIds);
    expect(uniqueIds.size).toBe(deviceIds.length);
  });
});

describe("ComputedReminderStateRecord type validation", () => {
  it("should have valid estimated_battery_percent (0-100 or null)", () => {
    for (const state of fixturesComputedReminderStates) {
      expect(
        state.estimated_battery_percent === null ||
          (state.estimated_battery_percent >= 0 &&
            state.estimated_battery_percent <= 100)
      ).toBe(true);
    }
  });

  it("should have valid status values", () => {
    for (const state of fixturesComputedReminderStates) {
      expect(typeof state.status).toBe("string");
      expect(state.status.length).toBeGreaterThan(0);
    }
  });

  it("should have non-empty heuristic_version", () => {
    for (const state of fixturesComputedReminderStates) {
      expect(state.heuristic_version.length).toBeGreaterThan(0);
    }
  });
});

describe("DeviceWithChargeHistory type validation", () => {
  it("should include all required relations", () => {
    const full = fixtureDeviceWithHistory;
    expect(full.device).toBeDefined();
    expect(full.preset).toBeDefined();
    expect(Array.isArray(full.charge_events)).toBe(true);
    expect(
      full.reminder_preference === null ||
        typeof full.reminder_preference === "object"
    ).toBe(true);
    expect(
      full.computed_reminder_state === null ||
        typeof full.computed_reminder_state === "object"
    ).toBe(true);
  });

  it("should have matching device_type between device and preset", () => {
    const full = fixtureDeviceWithHistory;
    expect(full.device.device_type).toBe(full.preset.type);
  });
});

describe("Input type validation", () => {
  it("should accept valid CreateDeviceInput", () => {
    const input: CreateDeviceInput = {
      user_id: TEST_USER_ID,
      name: "New Device",
      device_type: "wireless-mouse",
      threshold_percent: 25,
    };
    expect(input.name.length).toBeGreaterThan(0);
    expect(input.threshold_percent >= 0 && input.threshold_percent <= 100).toBe(
      true
    );
  });

  it("should accept valid UpdateDeviceInput", () => {
    const input: UpdateDeviceInput = {
      id: "22222222-2222-2222-2222-222222222221",
      name: "Updated Name",
    };
    expect(typeof input.name).toBe("string");
  });

  it("should accept valid CreateChargeEventInput", () => {
    const input: CreateChargeEventInput = {
      device_id: "22222222-2222-2222-2222-222222222221",
      charged_at: new Date().toISOString(),
    };
    expect(input.charged_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should accept valid UpsertReminderPreferenceInput", () => {
    const input: UpsertReminderPreferenceInput = {
      device_id: "22222222-2222-2222-2222-222222222221",
      notify_before_days: 3,
    };
    expect(input.notify_before_days).toBeGreaterThanOrEqual(0);
  });

  it("should accept valid UpsertComputedReminderStateInput", () => {
    const input: UpsertComputedReminderStateInput = {
      device_id: "22222222-2222-2222-2222-222222222221",
      heuristic_version: "v1.0",
      status: "ok",
      basis: "linear_drain",
      computed_at: new Date().toISOString(),
    };
    expect(input.status.length).toBeGreaterThan(0);
    expect(input.basis.length).toBeGreaterThan(0);
  });
});

describe("DevicePresetType union validation", () => {
  it("should accept all valid preset types", () => {
    const validTypes: DevicePresetType[] = [
      "wireless-mouse",
      "game-controller",
      "wireless-keyboard",
      "bluetooth-headphones",
      "power-bank",
    ];
    for (const type of validTypes) {
      expect(ALL_DEVICE_PRESET_TYPES.includes(type)).toBe(true);
    }
  });
});
