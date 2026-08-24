export function shouldPromptForCheckIn(
  elapsedSeconds: number,
  recordedSeconds: number,
  intervalMinutes: number,
): boolean {
  return elapsedSeconds - recordedSeconds >= intervalMinutes * 60;
}

export function unrecordedSeconds(
  elapsedSeconds: number,
  recordedSeconds: number,
): number {
  return Math.max(0, elapsedSeconds - recordedSeconds);
}

export function unrecordedAfterPendingCheckIn(
  elapsedSeconds: number,
  recordedSeconds: number,
  pendingDurationSeconds: number,
): number {
  return Math.max(0, unrecordedSeconds(elapsedSeconds, recordedSeconds) - pendingDurationSeconds);
}

export function hasProgressChanged(
  elapsedSeconds: number,
  recordedSeconds: number,
  nextElapsedSeconds: number,
  nextRecordedSeconds: number,
): boolean {
  return elapsedSeconds !== nextElapsedSeconds || recordedSeconds !== nextRecordedSeconds;
}
