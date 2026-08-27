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
