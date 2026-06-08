/**
 * Charger-Reminder persistence for Tauri desktop via raw SQLite queries.
 *
 * Implements DevicePersistenceContract from
 * apps/web/src/features/charger-reminder/database/contracts.ts
 * using local SQLite via @tauri-apps/plugin-sql.
 *
 * All SQL uses $1, $2, ... placeholder syntax (sqlx / Tauri plugin-sql style).
 * No Supabase, no server actions — pure client-side database access.
 */

import { dbSelect, dbExecute } from "../../lib/db";
import { computeDeterministicReminderState } from "./heuristic-engine";
import { devicePresetSeeds } from "./device-presets";
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPresetFromSeeds(deviceType: DevicePresetType): DevicePresetRecord {
  const seed = devicePresetSeeds.find((entry) => entry.type === deviceType);

  if (!seed) {
    throw new Error(`Unsupported device preset: ${deviceType}`);
  }

  return {
    ...seed,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function sortChargeEventsDescending(events: ChargeEventRecord[]): ChargeEventRecord[] {
  return [...events].sort(
    (left, right) =>
      Date.parse(right.charged_at) - Date.parse(left.charged_at) ||
      Date.parse(right.created_at) - Date.parse(left.created_at),
  );
}

function validateChargeEventTimestamp(chargedAt: string): void {
  const parsedTimestamp = Date.parse(chargedAt);

  if (Number.isNaN(parsedTimestamp)) {
    throw new Error("Full-charge datetime must be a valid ISO timestamp");
  }

  if (parsedTimestamp > Date.now()) {
    throw new Error("Full-charge datetime cannot be in the future");
  }
}

export function getDefaultThresholdForPreset(presetType: DevicePresetType): number {
  const thresholds: Record<DevicePresetType, number> = {
    "wireless-mouse": 25,
    "game-controller": 30,
    "wireless-keyboard": 20,
    "bluetooth-headphones": 35,
    "power-bank": 40,
  };

  return thresholds[presetType] ?? 25;
}

// ---------------------------------------------------------------------------
// Internal helpers (not part of the public contract)
// ---------------------------------------------------------------------------

async function recomputeReminderStateForDevice(deviceId: Uuid): Promise<void> {
  const device = await getDeviceByIdInternal(deviceId);

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

  await setComputedReminderStateInternal({
    device_id: device.device.id,
    ...heuristicState,
    computed_at: computedAt,
    last_charge_event_id: latestChargeEvent?.id ?? null,
  });
}

// Inline getDeviceById (without going through the public export) so
// recomputeReminderStateForDevice can call it without self-reference issues.
async function getDeviceByIdInternal(
  deviceId: Uuid,
): Promise<DeviceWithChargeHistory | null> {
  const deviceRows = await dbSelect<DeviceRecord>(
    `SELECT * FROM cr_devices WHERE id = $1`,
    [deviceId],
  );
  if (deviceRows.length === 0) return null;
  const device = deviceRows[0];

  const preset = buildPresetFromSeeds(device.device_type);

  const prefRows = await dbSelect<ReminderPreferenceRecord>(
    `SELECT * FROM cr_reminder_preferences WHERE device_id = $1`,
    [deviceId],
  );
  const reminder_preference = prefRows[0] ?? null;

  const stateRows = await dbSelect<ComputedReminderStateRecord>(
    `SELECT * FROM cr_computed_reminder_states WHERE device_id = $1`,
    [deviceId],
  );
  const computed_reminder_state = stateRows[0] ?? null;

  const eventRows = await dbSelect<ChargeEventRecord>(
    `SELECT * FROM cr_charge_events WHERE device_id = $1 ORDER BY charged_at DESC`,
    [deviceId],
  );

  return {
    device,
    preset,
    reminder_preference,
    computed_reminder_state,
    charge_events: sortChargeEventsDescending(eventRows),
  };
}

// Inline setComputedReminderState so recomputeReminderStateForDevice can
// call it without going through the public export.
async function setComputedReminderStateInternal(
  input: UpsertComputedReminderStateInput,
): Promise<ComputedReminderStateRecord> {
  const existingRows = await dbSelect<ComputedReminderStateRecord>(
    `SELECT * FROM cr_computed_reminder_states WHERE device_id = $1`,
    [input.device_id],
  );
  const existing = existingRows[0];
  const id = existing?.id ?? crypto.randomUUID();
  const createdAt = existing?.created_at ?? new Date().toISOString();
  const updatedAt = new Date().toISOString();

  await dbExecute(
    `INSERT OR REPLACE INTO cr_computed_reminder_states
       (id, device_id, heuristic_version, estimated_battery_percent,
        estimated_days_until_threshold, reminder_due_at, status, basis,
        last_charge_event_id, computed_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id,
      input.device_id,
      input.heuristic_version,
      input.estimated_battery_percent ?? null,
      input.estimated_days_until_threshold ?? null,
      input.reminder_due_at ?? null,
      input.status,
      input.basis,
      input.last_charge_event_id ?? null,
      input.computed_at,
      createdAt,
      updatedAt,
    ],
  );

  const resultRows = await dbSelect<ComputedReminderStateRecord>(
    `SELECT * FROM cr_computed_reminder_states WHERE id = $1`,
    [id],
  );

  return resultRows[0];
}

// ---------------------------------------------------------------------------
// Public contract methods
// ---------------------------------------------------------------------------

export async function setReminderPreference(
  input: UpsertReminderPreferenceInput,
): Promise<ReminderPreferenceRecord> {
  const existingRows = await dbSelect<ReminderPreferenceRecord>(
    `SELECT * FROM cr_reminder_preferences WHERE device_id = $1`,
    [input.device_id],
  );
  const existing = existingRows[0];
  const id = existing?.id ?? crypto.randomUUID();
  const createdAt = existing?.created_at ?? new Date().toISOString();
  const updatedAt = new Date().toISOString();

  await dbExecute(
    `INSERT OR REPLACE INTO cr_reminder_preferences
       (id, device_id, notify_before_days, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, input.device_id, input.notify_before_days, createdAt, updatedAt],
  );

  const resultRows = await dbSelect<ReminderPreferenceRecord>(
    `SELECT * FROM cr_reminder_preferences WHERE id = $1`,
    [id],
  );

  return resultRows[0];
}

export async function createDevice(
  input: CreateDeviceInput,
  notifyBeforeDays?: number,
): Promise<DeviceRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await dbExecute(
    `INSERT INTO cr_devices
       (id, user_id, name, device_type, capacity_mah, notes,
        threshold_percent, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      input.user_id,
      input.name,
      input.device_type,
      input.capacity_mah ?? null,
      input.notes ?? null,
      input.threshold_percent,
      now,
      now,
    ],
  );

  const resultRows = await dbSelect<DeviceRecord>(
    `SELECT * FROM cr_devices WHERE id = $1`,
    [id],
  );
  const created = resultRows[0];

  if (notifyBeforeDays !== undefined && notifyBeforeDays > 0) {
    await setReminderPreference({
      device_id: created.id,
      notify_before_days: notifyBeforeDays,
    });
  }

  await recomputeReminderStateForDevice(created.id);
  return created;
}

export async function updateDevice(
  input: UpdateDeviceInput,
  notifyBeforeDays?: number,
): Promise<DeviceRecord> {
  const existingRows = await dbSelect<DeviceRecord>(
    `SELECT * FROM cr_devices WHERE id = $1`,
    [input.id],
  );
  if (existingRows.length === 0) {
    throw new Error(`Device not found: ${input.id}`);
  }

  const existing = existingRows[0];
  const updatedAt = new Date().toISOString();

  const name = input.name ?? existing.name;
  const deviceType = input.device_type ?? existing.device_type;
  const capacityMah =
    input.capacity_mah !== undefined ? input.capacity_mah : existing.capacity_mah;
  const notes = input.notes !== undefined ? input.notes : existing.notes;
  const thresholdPercent =
    input.threshold_percent !== undefined
      ? input.threshold_percent
      : existing.threshold_percent;

  await dbExecute(
    `UPDATE cr_devices
     SET name = $1, device_type = $2, capacity_mah = $3, notes = $4,
         threshold_percent = $5, updated_at = $6
     WHERE id = $7`,
    [name, deviceType, capacityMah, notes, thresholdPercent, updatedAt, input.id],
  );

  if (notifyBeforeDays !== undefined && notifyBeforeDays > 0) {
    await setReminderPreference({
      device_id: input.id,
      notify_before_days: notifyBeforeDays,
    });
  }

  await recomputeReminderStateForDevice(input.id);

  const resultRows = await dbSelect<DeviceRecord>(
    `SELECT * FROM cr_devices WHERE id = $1`,
    [input.id],
  );
  return resultRows[0];
}

export async function deleteDevice(deviceId: Uuid): Promise<void> {
  // CASCADE deletes handle charge_events, reminder_preferences,
  // and computed_reminder_states automatically.
  await dbExecute(`DELETE FROM cr_devices WHERE id = $1`, [deviceId]);
}

export async function getDeviceById(
  deviceId: Uuid,
): Promise<DeviceWithChargeHistory | null> {
  return getDeviceByIdInternal(deviceId);
}

export async function listDevicesByUser(
  userId: Uuid,
): Promise<DeviceWithChargeHistory[]> {
  const deviceRows = await dbSelect<DeviceRecord>(
    `SELECT * FROM cr_devices WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );

  if (deviceRows.length === 0) return [];

  const results: DeviceWithChargeHistory[] = [];

  for (const device of deviceRows) {
    const deviceId = device.id;

    const preset = buildPresetFromSeeds(device.device_type);

    const prefRows = await dbSelect<ReminderPreferenceRecord>(
      `SELECT * FROM cr_reminder_preferences WHERE device_id = $1`,
      [deviceId],
    );
    const reminder_preference = prefRows[0] ?? null;

    const stateRows = await dbSelect<ComputedReminderStateRecord>(
      `SELECT * FROM cr_computed_reminder_states WHERE device_id = $1`,
      [deviceId],
    );
    const computed_reminder_state = stateRows[0] ?? null;

    const eventRows = await dbSelect<ChargeEventRecord>(
      `SELECT * FROM cr_charge_events WHERE device_id = $1 ORDER BY charged_at DESC`,
      [deviceId],
    );

    results.push({
      device,
      preset,
      reminder_preference,
      computed_reminder_state,
      charge_events: sortChargeEventsDescending(eventRows),
    });
  }

  return results;
}

export async function logChargeEvent(
  input: CreateChargeEventInput,
): Promise<ChargeEventRecord> {
  validateChargeEventTimestamp(input.charged_at);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await dbExecute(
    `INSERT INTO cr_charge_events
       (id, device_id, charged_at, notes, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, input.device_id, input.charged_at, input.notes ?? null, now],
  );

  const resultRows = await dbSelect<ChargeEventRecord>(
    `SELECT * FROM cr_charge_events WHERE id = $1`,
    [id],
  );

  await recomputeReminderStateForDevice(input.device_id);
  return resultRows[0];
}

export async function setComputedReminderState(
  input: UpsertComputedReminderStateInput,
): Promise<ComputedReminderStateRecord> {
  return setComputedReminderStateInternal(input);
}

// ---------------------------------------------------------------------------
// Contract object
// ---------------------------------------------------------------------------

import type { DevicePersistenceContract } from "./contracts";

export const chargerReminderDb: DevicePersistenceContract = {
  createDevice,
  updateDevice,
  deleteDevice,
  getDeviceById,
  listDevicesByUser,
  logChargeEvent,
  setReminderPreference,
  setComputedReminderState,
};
