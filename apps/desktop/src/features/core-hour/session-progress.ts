import { CORE_HOUR_SESSION_PROGRESS_KEY } from "../../lib/storage-keys";
import type { UncertainInterval } from "./timer-gaps";

export interface StoredSessionProgress {
  sessionId: string;
  elapsedSeconds: number;
  recordedSeconds: number;
  uncertainInterval: UncertainInterval | null;
}

type ReadableStorage = Pick<Storage, "getItem" | "removeItem">;
type WritableStorage = Pick<Storage, "setItem">;

function validUncertainInterval(value: unknown): value is UncertainInterval | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const interval = value as Partial<UncertainInterval>;
  return (interval.reason === "scheduler-gap" || interval.reason === "system-idle")
    && Number.isFinite(interval.durationSeconds)
    && Number(interval.durationSeconds) > 0
    && Number.isFinite(interval.countedSeconds)
    && Number(interval.countedSeconds) >= 0
    && Number(interval.countedSeconds) <= Number(interval.durationSeconds)
    && typeof interval.detectedAt === "string";
}

export function readSessionProgress(
  sessionId: string,
  storage: ReadableStorage = window.localStorage,
): StoredSessionProgress | null {
  const raw = storage.getItem(CORE_HOUR_SESSION_PROGRESS_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredSessionProgress>;
    const uncertainInterval = value.uncertainInterval ?? null;
    if (value.sessionId !== sessionId
      || typeof value.elapsedSeconds !== "number"
      || !Number.isFinite(value.elapsedSeconds)
      || value.elapsedSeconds < 0
      || typeof value.recordedSeconds !== "number"
      || !Number.isFinite(value.recordedSeconds)
      || value.recordedSeconds < 0
      || value.recordedSeconds > value.elapsedSeconds
      || !validUncertainInterval(uncertainInterval)
      || (uncertainInterval !== null
        && uncertainInterval.countedSeconds > value.elapsedSeconds - value.recordedSeconds)) {
      throw new Error("invalid-progress");
    }
    return {
      sessionId,
      elapsedSeconds: value.elapsedSeconds,
      recordedSeconds: value.recordedSeconds,
      uncertainInterval,
    };
  } catch {
    storage.removeItem(CORE_HOUR_SESSION_PROGRESS_KEY);
    return null;
  }
}

export function writeSessionProgress(
  progress: StoredSessionProgress,
  storage: WritableStorage = window.localStorage,
): void {
  storage.setItem(CORE_HOUR_SESSION_PROGRESS_KEY, JSON.stringify(progress));
}

export function clearSessionProgress(
  storage: Pick<Storage, "removeItem"> = window.localStorage,
): void {
  storage.removeItem(CORE_HOUR_SESSION_PROGRESS_KEY);
}
