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

export function hasProgressChanged(
  elapsedSeconds: number,
  recordedSeconds: number,
  nextElapsedSeconds: number,
  nextRecordedSeconds: number,
): boolean {
  return elapsedSeconds !== nextElapsedSeconds || recordedSeconds !== nextRecordedSeconds;
}
