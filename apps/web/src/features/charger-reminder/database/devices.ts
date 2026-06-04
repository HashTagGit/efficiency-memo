"use server";

import { revalidatePath } from "next/cache";

import { requireSessionUser } from "@/lib/auth/session";
import { devicePresetSeeds } from "@/features/charger-reminder/database/device-presets";
import { computeDeterministicReminderState } from "@/features/charger-reminder/reminders/heuristic-engine";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ChargeEventRecord,
  ComputedReminderStateRecord,
  CreateChargeEventInput,
  CreateDeviceInput,
  DevicePresetRecord,
  DevicePresetType,
  DeviceRecord,
  DeviceWithChargeHistory,
  ReminderPreferenceRecord,
  UpsertComputedReminderStateInput,
  UpsertReminderPreferenceInput,
  UpdateDeviceInput,
  Uuid,
} from "./contracts";

const isE2EMockDb = () => process.env.E2E_MOCK_DB === "true";
const MOCK_REFERENCE_TIMESTAMP = "2026-01-01T00:00:00Z";

let mockDevices: DeviceRecord[] = [];
const mockChargeEvents: ChargeEventRecord[] = [];
const mockReminderPreferences: ReminderPreferenceRecord[] = [];
let mockComputedReminderStates: ComputedReminderStateRecord[] = [];
let mockIdCounter = 1;
let mockChargeEventIdCounter = 1;

function buildMockPreset(deviceType: DevicePresetType): DevicePresetRecord {
  const preset = devicePresetSeeds.find((entry) => entry.type === deviceType);

  if (!preset) {
    throw new Error(`Unsupported device preset: ${deviceType}`);
  }

  return {
    ...preset,
    created_at: MOCK_REFERENCE_TIMESTAMP,
    updated_at: MOCK_REFERENCE_TIMESTAMP,
  };
}

function buildPresetFromSeeds(deviceType: DevicePresetType): DevicePresetRecord {
  const seed = devicePresetSeeds.find((entry) => entry.type === deviceType);

  if (!seed) {
    throw new Error(`Unsupported device preset: ${deviceType}`);
  }

  return {
    ...seed,
    created_at: MOCK_REFERENCE_TIMESTAMP,
    updated_at: MOCK_REFERENCE_TIMESTAMP,
  };
}

function sortChargeEventsDescending(events: ChargeEventRecord[]) {
  return [...events].sort(
    (left, right) =>
      Date.parse(right.charged_at) - Date.parse(left.charged_at) ||
      Date.parse(right.created_at) - Date.parse(left.created_at),
  );
}

function validateChargeEventTimestamp(chargedAt: string) {
  const parsedTimestamp = Date.parse(chargedAt);

  if (Number.isNaN(parsedTimestamp)) {
    throw new Error("Full-charge datetime must be a valid ISO timestamp");
  }

  if (parsedTimestamp > Date.now()) {
    throw new Error("Full-charge datetime cannot be in the future");
  }
}

export async function setReminderPreference(
  input: UpsertReminderPreferenceInput,
): Promise<ReminderPreferenceRecord> {
  if (isE2EMockDb()) {
    const existing = mockReminderPreferences.find(
      (entry) => entry.device_id === input.device_id,
    );
    const record: ReminderPreferenceRecord = {
      id: existing?.id ?? `mock-reminder-pref-${input.device_id}`,
      device_id: input.device_id,
      notify_before_days: input.notify_before_days,
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const index = mockReminderPreferences.findIndex(
      (entry) => entry.device_id === input.device_id,
    );
    if (index >= 0) {
      mockReminderPreferences.splice(index, 1, record);
    } else {
      mockReminderPreferences.push(record);
    }
    return record;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cr_reminder_preferences")
    .upsert(
      {
        device_id: input.device_id,
        notify_before_days: input.notify_before_days,
      },
      { onConflict: "device_id" },
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set reminder preference: ${error.message}`);
  }

  return data as ReminderPreferenceRecord;
}

async function recomputeReminderStateForDevice(deviceId: Uuid) {
  const device = await getDeviceById(deviceId);

  if (!device) {
    throw new Error(`Device not found: ${deviceId}`);
  }

  const latestChargeEvent = device.charge_events[0] ?? null;
  const computedAt = new Date().toISOString();
  const heuristicState = computeDeterministicReminderState({
    device_type: device.device.device_type,
    capacity_mah: device.device.capacity_mah,
    threshold_percent: device.device.threshold_percent,
    notify_before_days: device.reminder_preference?.notify_before_days,
    last_full_charge_at: latestChargeEvent?.charged_at ?? null,
    computed_at: computedAt,
  });

  return setComputedReminderState({
    device_id: device.device.id,
    ...heuristicState,
    computed_at: computedAt,
    last_charge_event_id: latestChargeEvent?.id ?? null,
  });
}

export async function createDevice(
  input: CreateDeviceInput,
  notifyBeforeDays?: number,
): Promise<DeviceRecord> {
  if (isE2EMockDb()) {
    const newDevice: DeviceRecord = {
      id: `mock-device-${mockIdCounter++}`,
      user_id: input.user_id || "mock-user-id",
      name: input.name,
      device_type: input.device_type,
      capacity_mah: input.capacity_mah ?? null,
      notes: input.notes ?? null,
      threshold_percent: input.threshold_percent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDevices.push(newDevice);

    if (notifyBeforeDays !== undefined && notifyBeforeDays > 0) {
      await setReminderPreference({
        device_id: newDevice.id,
        notify_before_days: notifyBeforeDays,
      });
    }

    await recomputeReminderStateForDevice(newDevice.id);
    revalidatePath("/tools/charger-reminder");
    return newDevice;
  }

  const sessionUser = await requireSessionUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("cr_devices")
    .insert({
      user_id: sessionUser.id,
      name: input.name,
      device_type: input.device_type,
      capacity_mah: input.capacity_mah ?? null,
      notes: input.notes ?? null,
      threshold_percent: input.threshold_percent,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create device: ${error.message}`);
  }

  const created = data as DeviceRecord;

  if (notifyBeforeDays !== undefined && notifyBeforeDays > 0) {
    await setReminderPreference({
      device_id: created.id,
      notify_before_days: notifyBeforeDays,
    });
  }

  await recomputeReminderStateForDevice(created.id);
  revalidatePath("/tools/charger-reminder");
  return created;
}

export async function updateDevice(
  input: UpdateDeviceInput,
  notifyBeforeDays?: number,
): Promise<DeviceRecord> {
  if (isE2EMockDb()) {
    const index = mockDevices.findIndex(d => d.id === input.id);
    if (index === -1) {
      throw new Error(`Device not found: ${input.id}`);
    }
    const updated: DeviceRecord = {
      ...mockDevices[index],
      ...(input.name !== undefined && { name: input.name }),
      ...(input.device_type !== undefined && { device_type: input.device_type }),
      ...(input.capacity_mah !== undefined && { capacity_mah: input.capacity_mah }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.threshold_percent !== undefined && { threshold_percent: input.threshold_percent }),
      updated_at: new Date().toISOString(),
    };
    mockDevices[index] = updated;

    if (notifyBeforeDays !== undefined && notifyBeforeDays > 0) {
      await setReminderPreference({
        device_id: input.id,
        notify_before_days: notifyBeforeDays,
      });
    }

    await recomputeReminderStateForDevice(input.id);

    revalidatePath("/tools/charger-reminder");
    revalidatePath(`/tools/charger-reminder/${input.id}`);
    return updated;
  }

  const supabase = await createSupabaseServerClient();

  const updateData: Partial<DeviceRecord> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.device_type !== undefined) updateData.device_type = input.device_type;
  if (input.capacity_mah !== undefined) updateData.capacity_mah = input.capacity_mah;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.threshold_percent !== undefined) updateData.threshold_percent = input.threshold_percent;

  const { data, error } = await supabase
    .from("cr_devices")
    .update(updateData)
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update device: ${error.message}`);
  }

  if (notifyBeforeDays !== undefined && notifyBeforeDays > 0) {
    await setReminderPreference({
      device_id: input.id,
      notify_before_days: notifyBeforeDays,
    });
  }

  await recomputeReminderStateForDevice(input.id);

  revalidatePath("/devices");
  revalidatePath(`/devices/${input.id}`);

  return data as DeviceRecord;
}

export async function deleteDevice(deviceId: Uuid): Promise<void> {
  if (isE2EMockDb()) {
    mockDevices = mockDevices.filter(d => d.id !== deviceId);
    revalidatePath("/tools/charger-reminder");
    return;
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("cr_devices").delete().eq("id", deviceId);

  if (error) {
    throw new Error(`Failed to delete device: ${error.message}`);
  }

  revalidatePath("/devices");
}

export async function getDeviceById(
  deviceId: Uuid,
): Promise<DeviceWithChargeHistory | null> {
  if (isE2EMockDb()) {
    const device = mockDevices.find((entry) => entry.id === deviceId);
    if (!device) return null;

    return {
      device,
      preset: buildMockPreset(device.device_type),
      reminder_preference:
        mockReminderPreferences.find((entry) => entry.device_id === deviceId) ?? null,
      computed_reminder_state:
        mockComputedReminderStates.find((entry) => entry.device_id === deviceId) ?? null,
      charge_events: sortChargeEventsDescending(
        mockChargeEvents.filter((entry) => entry.device_id === deviceId),
      ),
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: deviceData, error: deviceError } = await supabase
    .from("cr_devices")
    .select("*")
    .eq("id", deviceId)
    .single();

  if (deviceError || !deviceData) {
    return null;
  }

  const device = deviceData as DeviceRecord;

  const { data: preferenceData } = await supabase
    .from("cr_reminder_preferences")
    .select("*")
    .eq("device_id", deviceId)
    .single();

  const { data: stateData } = await supabase
    .from("cr_computed_reminder_states")
    .select("*")
    .eq("device_id", deviceId)
    .single();

  const { data: chargeEventsData } = await supabase
    .from("cr_charge_events")
    .select("*")
    .eq("device_id", deviceId)
    .order("charged_at", { ascending: false });

  return {
    device,
    preset: buildPresetFromSeeds(device.device_type),
    reminder_preference: preferenceData || null,
    computed_reminder_state: stateData || null,
    charge_events: (chargeEventsData as unknown[]) || [],
  } as DeviceWithChargeHistory;
}

export async function listDevicesByUser(userId: Uuid): Promise<DeviceWithChargeHistory[]> {
  if (isE2EMockDb()) {
    return mockDevices
      .filter((device) => device.user_id === userId)
      .map(device => ({
        device,
        preset: buildMockPreset(device.device_type),
        reminder_preference:
          mockReminderPreferences.find((entry) => entry.device_id === device.id) ?? null,
        computed_reminder_state:
          mockComputedReminderStates.find((entry) => entry.device_id === device.id) ?? null,
        charge_events: sortChargeEventsDescending(
          mockChargeEvents.filter((entry) => entry.device_id === device.id),
        ),
      }));
  }

  const supabase = await createSupabaseServerClient();

  const { data: devicesData, error: devicesError } = await supabase
    .from("cr_devices")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (devicesError || !devicesData) {
    return [];
  }

  const devices: DeviceWithChargeHistory[] = [];

  for (const deviceRow of devicesData) {
    const deviceId = deviceRow.id;
    const device = deviceRow as DeviceRecord;

    const { data: preferenceData } = await supabase
      .from("cr_reminder_preferences")
      .select("*")
      .eq("device_id", deviceId)
      .single();

    const { data: stateData } = await supabase
      .from("cr_computed_reminder_states")
      .select("*")
      .eq("device_id", deviceId)
      .single();

    const { data: chargeEventsData } = await supabase
      .from("cr_charge_events")
      .select("*")
      .eq("device_id", deviceId)
      .order("charged_at", { ascending: false });

    devices.push({
      device,
      preset: buildPresetFromSeeds(device.device_type),
      reminder_preference: preferenceData || null,
      computed_reminder_state: stateData || null,
      charge_events: (chargeEventsData as ChargeEventRecord[] | null) ?? [],
    });
  }

  return devices;
}

export async function getDevicePresets(): Promise<Array<{
  id: string;
  type: DevicePresetType;
  label: string;
  icon?: string;
  default_threshold: number;
}>> {
  if (isE2EMockDb() || process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("localhost")) {
    return [
      { id: "1", type: "game-controller" as DevicePresetType, label: "Game Controller", icon: "gamepad", default_threshold: 30 },
      { id: "2", type: "wireless-mouse" as DevicePresetType, label: "Wireless Mouse", icon: "mouse", default_threshold: 25 },
      { id: "3", type: "wireless-keyboard" as DevicePresetType, label: "Wireless Keyboard", icon: "keyboard", default_threshold: 20 },
      { id: "4", type: "bluetooth-headphones" as DevicePresetType, label: "Bluetooth Headphones", icon: "headphones", default_threshold: 35 },
      { id: "5", type: "power-bank" as DevicePresetType, label: "Power Bank", icon: "battery-charging", default_threshold: 40 },
    ];
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("cr_device_presets")
    .select("*")
    .order("label", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch device presets: ${error.message}`);
  }

  return data || [];
}

export async function getDefaultThresholdForPreset(presetType: DevicePresetType): Promise<number> {
  const thresholds: Record<DevicePresetType, number> = {
    "wireless-mouse": 25,
    "game-controller": 30,
    "wireless-keyboard": 20,
    "bluetooth-headphones": 35,
    "power-bank": 40,
  };

  return thresholds[presetType] ?? 25;
}

export async function setComputedReminderState(
  input: UpsertComputedReminderStateInput,
): Promise<ComputedReminderStateRecord> {
  if (isE2EMockDb()) {
    const nextState: ComputedReminderStateRecord = {
      id:
        mockComputedReminderStates.find((entry) => entry.device_id === input.device_id)?.id ??
        `mock-reminder-state-${input.device_id}`,
      device_id: input.device_id,
      heuristic_version: input.heuristic_version,
      estimated_battery_percent: input.estimated_battery_percent ?? null,
      estimated_days_until_threshold: input.estimated_days_until_threshold ?? null,
      reminder_due_at: input.reminder_due_at ?? null,
      status: input.status,
      basis: input.basis,
      last_charge_event_id: input.last_charge_event_id ?? null,
      computed_at: input.computed_at,
      created_at:
        mockComputedReminderStates.find((entry) => entry.device_id === input.device_id)?.created_at ??
        new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockComputedReminderStates = [
      ...mockComputedReminderStates.filter((entry) => entry.device_id !== input.device_id),
      nextState,
    ];

    return nextState;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cr_computed_reminder_states")
    .upsert(
      {
        device_id: input.device_id,
        heuristic_version: input.heuristic_version,
        estimated_battery_percent: input.estimated_battery_percent ?? null,
        estimated_days_until_threshold: input.estimated_days_until_threshold ?? null,
        reminder_due_at: input.reminder_due_at ?? null,
        status: input.status,
        basis: input.basis,
        last_charge_event_id: input.last_charge_event_id ?? null,
        computed_at: input.computed_at,
      },
      { onConflict: "device_id" },
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set computed reminder state: ${error.message}`);
  }

  return data as ComputedReminderStateRecord;
}

export async function logChargeEvent(
  input: CreateChargeEventInput,
): Promise<ChargeEventRecord> {
  await requireSessionUser();
  validateChargeEventTimestamp(input.charged_at);

  let event: ChargeEventRecord;

  if (isE2EMockDb()) {
    event = {
      id: `mock-charge-event-${mockChargeEventIdCounter++}`,
      device_id: input.device_id,
      charged_at: input.charged_at,
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
    };
    mockChargeEvents.push(event);
  } else {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cr_charge_events")
      .insert({
        device_id: input.device_id,
        charged_at: input.charged_at,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log charge event: ${error.message}`);
    }

    event = data as ChargeEventRecord;
  }

  await recomputeReminderStateForDevice(input.device_id);
  revalidatePath("/tools/charger-reminder");
  revalidatePath(`/tools/charger-reminder/${input.device_id}`);

  return event;
}
