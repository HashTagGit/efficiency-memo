import type {
  DeviceRecord,
  ChargeEventRecord,
  DevicePresetRecord,
  ReminderPreferenceRecord,
  ComputedReminderStateRecord,
  DeviceWithChargeHistory,
  DevicePresetType,
} from "../contracts";

// Test user ID (Supabase auth.users mock)
export const TEST_USER_ID = "11111111-1111-1111-1111-111111111111";
export const TEST_USER_EMAIL = "test@example.com";

// Device preset fixtures
export const fixturesDevicePresets: ReadonlyArray<DevicePresetRecord> = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    type: "wireless-mouse",
    default_threshold: 25,
    estimated_drain_per_month: 8.5,
    label: "Wireless Mouse",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    type: "game-controller",
    default_threshold: 30,
    estimated_drain_per_month: 18,
    label: "Game Controller",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    type: "wireless-keyboard",
    default_threshold: 20,
    estimated_drain_per_month: 5.5,
    label: "Wireless Keyboard",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    type: "bluetooth-headphones",
    default_threshold: 35,
    estimated_drain_per_month: 28,
    label: "Bluetooth Headphones",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    type: "power-bank",
    default_threshold: 40,
    estimated_drain_per_month: 4,
    label: "Power Bank",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },
];

// Sample device fixtures
export const fixturesDevices: ReadonlyArray<DeviceRecord> = [
  {
    id: "22222222-2222-2222-2222-222222222221",
    user_id: TEST_USER_ID,
    name: "Logitech MX Master 3",
    device_type: "wireless-mouse",
    capacity_mah: 1500,
    notes: "Primary work mouse",
    threshold_percent: 25,
    created_at: "2024-01-15T10:30:00.000Z",
    updated_at: "2024-01-15T10:30:00.000Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    user_id: TEST_USER_ID,
    name: "PS5 DualSense",
    device_type: "game-controller",
    capacity_mah: null,
    notes: null,
    threshold_percent: 30,
    created_at: "2024-02-20T14:00:00.000Z",
    updated_at: "2024-02-20T14:00:00.000Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222223",
    user_id: TEST_USER_ID,
    name: "Keychron K8 Pro",
    device_type: "wireless-keyboard",
    capacity_mah: 4000,
    notes: "TKL mechanical keyboard",
    threshold_percent: 20,
    created_at: "2024-03-10T08:00:00.000Z",
    updated_at: "2024-03-10T08:00:00.000Z",
  },
];

// Sample charge event fixtures
export const fixturesChargeEvents: ReadonlyArray<ChargeEventRecord> = [
  {
    id: "33333333-3333-3333-3333-333333333331",
    device_id: "22222222-2222-2222-2222-222222222221",
    charged_at: "2024-06-01T08:00:00.000Z",
    notes: "Full charge overnight",
    created_at: "2024-06-01T08:00:00.000Z",
  },
  {
    id: "33333333-3333-3333-3333-333333333332",
    device_id: "22222222-2222-2222-2222-222222222221",
    charged_at: "2024-06-10T20:00:00.000Z",
    notes: null,
    created_at: "2024-06-10T20:00:00.000Z",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    device_id: "22222222-2222-2222-2222-222222222222",
    charged_at: "2024-06-05T15:30:00.000Z",
    notes: "Controller was low",
    created_at: "2024-06-05T15:30:00.000Z",
  },
];

// Sample reminder preference fixtures
export const fixturesReminderPreferences: ReadonlyArray<ReminderPreferenceRecord> = [
  {
    id: "44444444-4444-4444-4444-444444444441",
    device_id: "22222222-2222-2222-2222-222222222221",
    notify_before_days: 3,
    created_at: "2024-01-15T10:30:00.000Z",
    updated_at: "2024-01-15T10:30:00.000Z",
  },
  {
    id: "44444444-4444-4444-4444-444444444442",
    device_id: "22222222-2222-2222-2222-222222222222",
    notify_before_days: 5,
    created_at: "2024-02-20T14:00:00.000Z",
    updated_at: "2024-02-20T14:00:00.000Z",
  },
];

// Sample computed reminder state fixtures
export const fixturesComputedReminderStates: ReadonlyArray<ComputedReminderStateRecord> = [
  {
    id: "55555555-5555-5555-5555-555555555551",
    device_id: "22222222-2222-2222-2222-222222222221",
    heuristic_version: "v1.0",
    estimated_battery_percent: 45.5,
    estimated_days_until_threshold: 4,
    reminder_due_at: "2024-06-14T08:00:00.000Z",
    status: "ok",
    basis: "linear_drain",
    last_charge_event_id: "33333333-3333-3333-3333-333333333332",
    computed_at: "2024-06-10T20:30:00.000Z",
    created_at: "2024-06-10T20:30:00.000Z",
    updated_at: "2024-06-10T20:30:00.000Z",
  },
  {
    id: "55555555-5555-5555-5555-555555555552",
    device_id: "22222222-2222-2222-2222-222222222222",
    heuristic_version: "v1.0",
    estimated_battery_percent: 12.0,
    estimated_days_until_threshold: 1,
    reminder_due_at: "2024-06-06T15:30:00.000Z",
    status: "due_soon",
    basis: "linear_drain",
    last_charge_event_id: "33333333-3333-3333-3333-333333333333",
    computed_at: "2024-06-05T16:00:00.000Z",
    created_at: "2024-06-05T16:00:00.000Z",
    updated_at: "2024-06-05T16:00:00.000Z",
  },
];

// Full DeviceWithChargeHistory fixture
export const fixtureDeviceWithHistory: DeviceWithChargeHistory = {
  device: fixturesDevices[0],
  preset: fixturesDevicePresets[0],
  reminder_preference: fixturesReminderPreferences[0],
  computed_reminder_state: fixturesComputedReminderStates[0],
  charge_events: [fixturesChargeEvents[0], fixturesChargeEvents[1]],
};

// Helper to create a new device fixture
export function createDeviceFixture(
  overrides: Partial<DeviceRecord> = {}
): DeviceRecord {
  return {
    id: "66666666-6666-6666-6666-666666666666",
    user_id: TEST_USER_ID,
    name: "New Device",
    device_type: "wireless-mouse",
    capacity_mah: null,
    notes: null,
    threshold_percent: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create a new charge event fixture
export function createChargeEventFixture(
  deviceId: string,
  overrides: Partial<ChargeEventRecord> = {}
): ChargeEventRecord {
  return {
    id: "77777777-7777-7777-7777-777777777777",
    device_id: deviceId,
    charged_at: new Date().toISOString(),
    notes: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// All device preset types for validation
export const ALL_DEVICE_PRESET_TYPES: DevicePresetType[] = [
  "wireless-mouse",
  "game-controller",
  "wireless-keyboard",
  "bluetooth-headphones",
  "power-bank",
];
