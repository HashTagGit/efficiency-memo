import type {
  DevicePresetRecord,
  DevicePresetType,
  IsoTimestamp,
  UpsertComputedReminderStateInput,
} from "@/features/charger-reminder/database/contracts";
import { devicePresetSeeds } from "@/features/charger-reminder/database/device-presets";

export const REMINDER_HEURISTIC_VERSION = "deterministic-v1" as const;
export const HEURISTIC_REFERENCE_CAPACITY_MAH = 2000;
export const HEURISTIC_MIN_CAPACITY_FACTOR = 0.5;
export const HEURISTIC_MAX_CAPACITY_FACTOR = 1.5;
export const HEURISTIC_DAYS_PER_MONTH = 30;

const FULL_BATTERY_PERCENT = 100;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

type ReminderPreset = Pick<
  DevicePresetRecord,
  "type" | "label" | "estimated_drain_per_month"
>;

export type ReminderHeuristicStatus =
  | "needs-charge-log"
  | "tracking"
  | "remind"
  | "charge-now";

export interface DeterministicReminderInput {
  device_type: DevicePresetType;
  capacity_mah?: number | null;
  threshold_percent: number;
  notify_before_days?: number;
  user_correction_factor?: number | null;
  last_full_charge_at: IsoTimestamp | null;
  computed_at: IsoTimestamp;
}

export interface DeterministicReminderState
  extends Pick<
    UpsertComputedReminderStateInput,
    | "heuristic_version"
    | "estimated_battery_percent"
    | "estimated_days_until_threshold"
    | "reminder_due_at"
    | "status"
    | "basis"
  > {
  heuristic_version: typeof REMINDER_HEURISTIC_VERSION;
  status: ReminderHeuristicStatus;
}

export function computeDeterministicReminderState(
  input: DeterministicReminderInput,
): DeterministicReminderState {
  validateInput(input);

  const preset = getReminderPreset(input.device_type);
  const notifyBeforeDays = input.notify_before_days ?? 0;

  if (input.last_full_charge_at === null) {
    return {
      heuristic_version: REMINDER_HEURISTIC_VERSION,
      estimated_battery_percent: null,
      estimated_days_until_threshold: null,
      reminder_due_at: null,
      status: "needs-charge-log",
      basis: `Heuristic ${REMINDER_HEURISTIC_VERSION}: waiting for first full-charge event for ${preset.label}.`,
    };
  }

  const computedAtMs = parseTimestamp(input.computed_at, "computed_at");
  const lastFullChargeAtMs = parseTimestamp(
    input.last_full_charge_at,
    "last_full_charge_at",
  );

  const elapsedDays = Math.max(
    0,
    (computedAtMs - lastFullChargeAtMs) / MILLISECONDS_PER_DAY,
  );
  const capacityFactor = getCapacityFactor(input.capacity_mah ?? null);
  const correctionFactor = input.user_correction_factor ?? 1;
  const effectiveDrainPerMonth = roundToTwo(
    preset.estimated_drain_per_month * capacityFactor * correctionFactor,
  );
  const drainPerDay = effectiveDrainPerMonth / HEURISTIC_DAYS_PER_MONTH;
  const estimatedBatteryPercent = roundToTwo(
    clamp(
      FULL_BATTERY_PERCENT - elapsedDays * drainPerDay,
      0,
      FULL_BATTERY_PERCENT,
    ),
  );

  const thresholdCrossingDays =
    (FULL_BATTERY_PERCENT - input.threshold_percent) / drainPerDay;
  const thresholdAtMs =
    lastFullChargeAtMs + thresholdCrossingDays * MILLISECONDS_PER_DAY;
  const reminderDueAtMs = thresholdAtMs - notifyBeforeDays * MILLISECONDS_PER_DAY;

  const estimatedDaysUntilThreshold = Math.max(
    0,
    Math.ceil((thresholdAtMs - computedAtMs) / MILLISECONDS_PER_DAY),
  );
  const reminderDueAt = new Date(reminderDueAtMs).toISOString();
  const status: ReminderHeuristicStatus =
    estimatedBatteryPercent <= input.threshold_percent
      ? "charge-now"
      : reminderDueAtMs <= computedAtMs
        ? "remind"
        : "tracking";

  return {
    heuristic_version: REMINDER_HEURISTIC_VERSION,
    estimated_battery_percent: estimatedBatteryPercent,
    estimated_days_until_threshold: estimatedDaysUntilThreshold,
    reminder_due_at: reminderDueAt,
    status,
    basis: buildBasis({
      preset,
      capacityMah: input.capacity_mah ?? null,
      capacityFactor,
      correctionFactor,
      effectiveDrainPerMonth,
      elapsedDays,
      thresholdPercent: input.threshold_percent,
      notifyBeforeDays,
    }),
  };
}

function buildBasis(input: {
  preset: ReminderPreset;
  capacityMah: number | null;
  capacityFactor: number;
  correctionFactor: number;
  effectiveDrainPerMonth: number;
  elapsedDays: number;
  thresholdPercent: number;
  notifyBeforeDays: number;
}): string {
  const capacityBasis =
    input.capacityMah === null ? "preset-only" : `${input.capacityMah}mAh`;

  return [
    `Heuristic ${REMINDER_HEURISTIC_VERSION}: ${input.preset.label} preset ${formatPercent(input.preset.estimated_drain_per_month)}/month`,
    `capacity factor ${formatNumber(input.capacityFactor)} (${capacityBasis})`,
    `correction factor ${formatNumber(input.correctionFactor)}`,
    `effective drain ${formatPercent(input.effectiveDrainPerMonth)}/month`,
    `elapsed ${formatDays(input.elapsedDays)}`,
    `threshold ${input.thresholdPercent}%`,
    `lead ${input.notifyBeforeDays}d.`,
  ].join(", ");
}

function getReminderPreset(deviceType: DevicePresetType): ReminderPreset {
  const preset = devicePresetSeeds.find((entry) => entry.type === deviceType);

  if (!preset) {
    throw new Error(`Unsupported device preset: ${deviceType}`);
  }

  return preset;
}

function getCapacityFactor(capacityMah: number | null): number {
  if (capacityMah === null) {
    return 1;
  }

  return roundToTwo(
    clamp(
      HEURISTIC_REFERENCE_CAPACITY_MAH / capacityMah,
      HEURISTIC_MIN_CAPACITY_FACTOR,
      HEURISTIC_MAX_CAPACITY_FACTOR,
    ),
  );
}

function validateInput(input: DeterministicReminderInput): void {
  if (input.threshold_percent < 0 || input.threshold_percent > 100) {
    throw new Error("threshold_percent must be between 0 and 100");
  }

  if (input.notify_before_days !== undefined && input.notify_before_days < 0) {
    throw new Error("notify_before_days must be zero or greater");
  }

  if (input.capacity_mah !== undefined && input.capacity_mah !== null && input.capacity_mah <= 0) {
    throw new Error("capacity_mah must be positive when provided");
  }

  if (
    input.user_correction_factor !== undefined &&
    input.user_correction_factor !== null &&
    input.user_correction_factor <= 0
  ) {
    throw new Error("user_correction_factor must be positive when provided");
  }

  parseTimestamp(input.computed_at, "computed_at");

  if (input.last_full_charge_at !== null) {
    parseTimestamp(input.last_full_charge_at, "last_full_charge_at");
  }
}

function parseTimestamp(value: IsoTimestamp, fieldName: string): number {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new Error(`${fieldName} must be a valid ISO timestamp`);
  }

  return timestamp;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatNumber(value: number): string {
  return value.toFixed(2);
}

function formatPercent(value: number): string {
  return value.toFixed(2) + "%";
}

function formatDays(value: number): string {
  return value.toFixed(2) + "d";
}
