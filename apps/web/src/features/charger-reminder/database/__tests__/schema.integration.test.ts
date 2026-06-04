// @vitest-environment node

import type {
  ChargeEventRecord,
  ComputedReminderStateRecord,
  DevicePresetRecord,
  DeviceRecord,
  ReminderPreferenceRecord,
} from "../contracts";
import { devicePresetSeeds } from "../device-presets";
import { createIntegrationDatabase } from "../test-database";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

interface UserRecord {
  id: string;
}

interface DeviceHistoryRow {
  device_id: string;
  device_name: string;
  capacity_mah: number | null;
  threshold_percent: number;
  user_id: string;
  preset_type: string;
  preset_label: string;
  notify_before_days: number | null;
  charge_event_id: string | null;
  charged_at: Date | string | null;
  charge_event_notes: string | null;
}

function toIsoString(value: Date | string | null) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

let harness: Awaited<ReturnType<typeof createIntegrationDatabase>>;

beforeEach(async () => {
  harness = await createIntegrationDatabase();
});

afterEach(async () => {
  if (harness) {
    await harness.pool.end();
  }
});

async function insertUser() {
  const result = await harness.pool.query<UserRecord>(
    `
      insert into auth.users (id)
      values (gen_random_uuid())
      returning *
    `,
  );

  return result.rows[0];
}

async function insertDevice(
  userId: string,
  overrides: Partial<
    Pick<DeviceRecord, "name" | "device_type" | "capacity_mah" | "notes" | "threshold_percent">
  > = {},
) {
  const result = await harness.pool.query<DeviceRecord>(
    `
      insert into cr_devices (
        user_id,
        name,
        device_type,
        capacity_mah,
        notes,
        threshold_percent
      )
      values ($1, $2, $3, $4, $5, $6)
      returning *
    `,
    [
      userId,
      overrides.name ?? "Desk Mouse",
      overrides.device_type ?? "wireless-mouse",
      overrides.capacity_mah ?? null,
      overrides.notes ?? null,
      overrides.threshold_percent ?? 20,
    ],
  );

  return result.rows[0];
}

describe("database schema migrations", () => {
  it("seeds the required device presets", async () => {
    const result = await harness.pool.query<DevicePresetRecord>(`
      select *
      from cr_device_presets
      order by type asc
    `);

    expect(result.rows).toHaveLength(devicePresetSeeds.length);
    expect(
      result.rows.map((preset) => ({
        id: preset.id,
        type: preset.type,
        default_threshold: preset.default_threshold,
        estimated_drain_per_month: Number(preset.estimated_drain_per_month),
        label: preset.label,
      })),
    ).toEqual(
      [...devicePresetSeeds]
        .map((preset) => ({
          ...preset,
          estimated_drain_per_month: Number(preset.estimated_drain_per_month),
        }))
        .sort((left, right) => left.type.localeCompare(right.type)),
    );
  });

  it("creates a device with unknown capacity and persists reminder preferences", async () => {
    const user = await insertUser();
    const device = await insertDevice(user.id, {
      name: "AA rechargeable battery pack",
      device_type: "game-controller",
      capacity_mah: null,
      threshold_percent: 20,
    });

    const preferenceResult = await harness.pool.query<ReminderPreferenceRecord>(
      `
        insert into cr_reminder_preferences (device_id, notify_before_days)
        values ($1, $2)
        returning *
      `,
      [device.id, 5],
    );

    const result = await harness.pool.query<
      DeviceRecord & {
        preset_label: string;
        preset_threshold: number;
        notify_before_days: number;
      }
    >(
      `
        select
          d.*,
          dp.label as preset_label,
          dp.default_threshold as preset_threshold,
          rp.notify_before_days
        from cr_devices d
        join cr_device_presets dp on dp.type = d.device_type
        join cr_reminder_preferences rp on rp.device_id = d.id
        where d.id = $1
      `,
      [device.id],
    );

    expect(preferenceResult.rows[0].notify_before_days).toBe(5);
    expect(result.rows[0]).toMatchObject({
      id: device.id,
      user_id: user.id,
      name: "AA rechargeable battery pack",
      device_type: "game-controller",
      capacity_mah: null,
      threshold_percent: 20,
      preset_label: "Game Controller",
      preset_threshold: 30,
      notify_before_days: 5,
    });
  });

  it("creates a device with known capacity", async () => {
    const user = await insertUser();
    const result = await harness.pool.query<DeviceRecord>(
      `
        insert into cr_devices (
          user_id,
          name,
          device_type,
          capacity_mah,
          notes,
          threshold_percent
        )
        values ($1, $2, $3, $4, $5, $6)
        returning *
      `,
      [
        user.id,
        "Bluetooth travel headset",
        "bluetooth-headphones",
        900,
        "Known battery spec from manual",
        35,
      ],
    );

    expect(result.rows[0]).toMatchObject({
      user_id: user.id,
      name: "Bluetooth travel headset",
      device_type: "bluetooth-headphones",
      capacity_mah: 900,
      notes: "Known battery spec from manual",
      threshold_percent: 35,
    });
  });

  it("rejects invalid threshold values", async () => {
    const user = await insertUser();

    await expect(
      harness.pool.query(
        `
          insert into cr_devices (user_id, name, device_type, threshold_percent)
          values ($1, $2, $3, $4)
        `,
        [user.id, "Bad Threshold Device", "wireless-keyboard", 120],
      ),
    ).rejects.toThrow(/cr_devices_threshold_percent_between_0_and_100/);

    await expect(
      harness.pool.query(
        `
          insert into cr_devices (user_id, name, device_type, threshold_percent)
          values ($1, $2, $3, $4)
        `,
        [user.id, "Another Bad Device", "wireless-keyboard", -5],
      ),
    ).rejects.toThrow(/cr_devices_threshold_percent_between_0_and_100/);
  });

  it("logs a charge event", async () => {
    const user = await insertUser();
    const device = await insertDevice(user.id, {
      name: "Office keyboard",
      device_type: "wireless-keyboard",
      threshold_percent: 25,
    });

    const result = await harness.pool.query<ChargeEventRecord>(
      `
        insert into cr_charge_events (device_id, charged_at, notes)
        values ($1, $2, $3)
        returning *
      `,
      [device.id, "2026-04-08T20:00:00Z", "Charged after battery warning"],
    );

    expect(result.rows[0]).toMatchObject({
      device_id: device.id,
      notes: "Charged after battery warning",
    });
    expect(toIsoString(result.rows[0].charged_at)).toBe(
      "2026-04-08T20:00:00.000Z",
    );
  });

  it("queries a device with charge history", async () => {
    const user = await insertUser();
    const device = await insertDevice(user.id, {
      name: "Living room controller",
      device_type: "game-controller",
      capacity_mah: null,
      threshold_percent: 30,
    });

    await harness.pool.query(
      `
        insert into cr_reminder_preferences (device_id, notify_before_days)
        values ($1, $2)
      `,
      [device.id, 7],
    );
    await harness.pool.query(
      `
        insert into cr_charge_events (device_id, charged_at, notes)
        values ($1, $2, $3), ($1, $4, $5)
      `,
      [
        device.id,
        "2026-04-01T18:00:00Z",
        "Before guests arrived",
        "2026-04-08T20:00:00Z",
        "After long weekend",
      ],
    );

    const history = await harness.pool.query<DeviceHistoryRow>(
      `
        select
          d.id as device_id,
          d.name as device_name,
          d.capacity_mah,
          d.threshold_percent,
          d.user_id,
          dp.type as preset_type,
          dp.label as preset_label,
          rp.notify_before_days,
          ce.id as charge_event_id,
          ce.charged_at,
          ce.notes as charge_event_notes
        from cr_devices d
        join cr_device_presets dp on dp.type = d.device_type
        left join cr_reminder_preferences rp on rp.device_id = d.id
        left join cr_charge_events ce on ce.device_id = d.id
        where d.id = $1
        order by ce.charged_at desc
      `,
      [device.id],
    );

    expect(history.rows).toHaveLength(2);
    expect(history.rows[0]).toMatchObject({
      device_id: device.id,
      device_name: "Living room controller",
      threshold_percent: 30,
      user_id: user.id,
      preset_type: "game-controller",
      preset_label: "Game Controller",
      notify_before_days: 7,
      charge_event_notes: "After long weekend",
    });
    expect(toIsoString(history.rows[0].charged_at)).toBe(
      "2026-04-08T20:00:00.000Z",
    );
    expect(history.rows[1]).toMatchObject({
      charge_event_notes: "Before guests arrived",
    });
    expect(toIsoString(history.rows[1].charged_at)).toBe(
      "2026-04-01T18:00:00.000Z",
    );
  });

  it("updates device state and cascades deletes across dependent tables", async () => {
    const user = await insertUser();
    const device = await insertDevice(user.id, {
      name: "Emergency power pack",
      device_type: "power-bank",
      capacity_mah: 10000,
      threshold_percent: 40,
    });
    const chargeEvent = await harness.pool.query<ChargeEventRecord>(
      `
        insert into cr_charge_events (device_id, charged_at, notes)
        values ($1, $2, $3)
        returning *
      `,
      [device.id, "2026-04-05T09:00:00Z", "Topped off before travel"],
    );

    await harness.pool.query<ReminderPreferenceRecord>(
      `
        insert into cr_reminder_preferences (device_id, notify_before_days)
        values ($1, $2)
      `,
      [device.id, 10],
    );
    await harness.pool.query<ComputedReminderStateRecord>(
      `
        insert into cr_computed_reminder_states (
          device_id,
          heuristic_version,
          estimated_battery_percent,
          estimated_days_until_threshold,
          reminder_due_at,
          status,
          basis,
          last_charge_event_id,
          computed_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        device.id,
        "v1-placeholder",
        86,
        90,
        "2026-07-04T09:00:00Z",
        "tracking",
        "preset default drain only",
        chargeEvent.rows[0].id,
        "2026-04-09T09:00:00Z",
      ],
    );

    const updatedDevice = await harness.pool.query<DeviceRecord>(
      `
        update cr_devices
        set threshold_percent = $2, updated_at = $3
        where id = $1
        returning *
      `,
      [device.id, 35, "2026-04-09T10:00:00Z"],
    );

    expect(updatedDevice.rows[0].threshold_percent).toBe(35);

    await harness.pool.query(
      `
        delete from cr_devices
        where id = $1
      `,
      [device.id],
    );

    const chargeEventsAfterDelete = await harness.pool.query<{ count: number }>(`
      select count(*)::int as count
      from cr_charge_events
    `);
    const preferencesAfterDelete = await harness.pool.query<{ count: number }>(`
      select count(*)::int as count
      from cr_reminder_preferences
    `);
    const stateAfterDelete = await harness.pool.query<{ count: number }>(`
      select count(*)::int as count
      from cr_computed_reminder_states
    `);

    expect(chargeEventsAfterDelete.rows[0].count).toBe(0);
    expect(preferencesAfterDelete.rows[0].count).toBe(0);
    expect(stateAfterDelete.rows[0].count).toBe(0);
  });
});
