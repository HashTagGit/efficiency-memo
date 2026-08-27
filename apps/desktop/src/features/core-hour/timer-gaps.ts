export type UncertainIntervalReason = "scheduler-gap" | "system-idle";

export interface UncertainInterval {
  reason: UncertainIntervalReason;
  durationSeconds: number;
  countedSeconds: number;
  detectedAt: string;
}

export const SCHEDULER_GAP_THRESHOLD_SECONDS = 30;
export const SYSTEM_IDLE_THRESHOLD_SECONDS = 5 * 60;

export function detectSchedulerGap(
  previousTickMs: number,
  currentTickMs: number,
  detectedAt = new Date(currentTickMs).toISOString(),
): UncertainInterval | null {
  const durationSeconds = Math.max(
    0,
    Math.floor((currentTickMs - previousTickMs) / 1000),
  );
  if (durationSeconds < SCHEDULER_GAP_THRESHOLD_SECONDS) return null;
  return {
    reason: "scheduler-gap",
    durationSeconds,
    countedSeconds: 0,
    detectedAt,
  };
}

export function detectSystemIdle(
  idleSeconds: number,
  elapsedSeconds: number,
  detectedAt = new Date().toISOString(),
): UncertainInterval | null {
  const durationSeconds = Math.min(
    Math.max(0, Math.floor(idleSeconds)),
    Math.max(0, Math.floor(elapsedSeconds)),
  );
  if (durationSeconds < SYSTEM_IDLE_THRESHOLD_SECONDS) return null;
  return {
    reason: "system-idle",
    durationSeconds,
    countedSeconds: durationSeconds,
    detectedAt,
  };
}

export function resolveUncertainElapsed(
  elapsedSeconds: number,
  interval: UncertainInterval,
  includedSeconds: number,
): number {
  const included = Math.min(
    interval.durationSeconds,
    Math.max(0, Math.round(includedSeconds)),
  );
  return Math.max(
    0,
    elapsedSeconds + included - interval.countedSeconds,
  );
}
