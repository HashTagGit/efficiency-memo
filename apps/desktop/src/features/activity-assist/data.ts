import { invoke } from "@tauri-apps/api/core";
import type { ActivityAssistPreferences, ActivityAssistState } from "./types";

export function loadActivityAssistState(userId: string): Promise<ActivityAssistState> {
  return invoke("load_activity_assist_state", { userId });
}

export function saveActivityAssistPreferences(
  userId: string,
  preferences: ActivityAssistPreferences,
  exclusions: string[],
): Promise<ActivityAssistState> {
  return invoke("save_activity_assist_preferences", {
    input: {
      userId,
      ...preferences,
      exclusions,
      updatedAt: new Date().toISOString(),
    },
  });
}

export function clearActivityAssistSamples(userId: string): Promise<ActivityAssistState> {
  return invoke("clear_activity_assist_samples", { userId });
}
