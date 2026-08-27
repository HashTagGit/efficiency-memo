export interface NaturalRestObservation {
  available: boolean;
  armed: boolean;
  shouldAttempt: boolean;
}

export function observeIdleForNaturalRest(
  armed: boolean,
  idleSeconds: number | null,
): NaturalRestObservation {
  if (idleSeconds === null) return { available: false, armed: false, shouldAttempt: false };
  if (idleSeconds < 60) return { available: true, armed: true, shouldAttempt: false };
  return { available: true, armed, shouldAttempt: armed };
}

export function hasReminderPollGap(
  previousPollAt: number,
  currentPollAt: number,
  pollIntervalMs = 30_000,
): boolean {
  return currentPollAt - previousPollAt >= pollIntervalMs * 3;
}

export function notificationAllowanceForPoll(
  adapterAllowance: boolean | null,
  adapterSupported: boolean | null,
  deferredAfterGap: boolean,
): boolean | null {
  if (adapterSupported === false) return true;
  if (adapterSupported === null) return null;
  return deferredAfterGap ? false : adapterAllowance;
}
