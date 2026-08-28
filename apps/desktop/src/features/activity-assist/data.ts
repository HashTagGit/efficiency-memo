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

export function dismissActivityAssistSuggestion(
  userId: string,
  suggestionId: string,
): Promise<ActivityAssistState> {
  return invoke("dismiss_activity_assist_suggestion", {
    userId,
    suggestionId,
    dismissedAt: new Date().toISOString(),
  });
}

export function acceptActivityAssistSuggestion(input: {
  userId: string;
  suggestionId: string;
  activity: string;
  defaultTagId: string | null;
  startedAt: string;
  endedAt: string;
  startLocalDate: string;
  endLocalDate: string;
  rememberRule: boolean;
}): Promise<ActivityAssistState> {
  return invoke("accept_activity_assist_suggestion", {
    input: {
      ...input,
      newSessionId: crypto.randomUUID(),
      newCheckInId: crypto.randomUUID(),
      newEntryId: crypto.randomUUID(),
      acceptedAt: new Date().toISOString(),
    },
  });
}

export function saveActivityAssistRule(input: {
  userId: string;
  applicationId: string;
  activity: string;
  defaultTagId: string | null;
}): Promise<ActivityAssistState> {
  return invoke("save_activity_assist_rule", {
    input: { ...input, updatedAt: new Date().toISOString() },
  });
}

export function deleteActivityAssistRule(
  userId: string,
  applicationId: string,
): Promise<ActivityAssistState> {
  return invoke("delete_activity_assist_rule", { userId, applicationId });
}
