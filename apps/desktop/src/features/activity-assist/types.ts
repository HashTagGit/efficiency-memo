export interface ActivityAssistPreferences {
  enabled: boolean;
  paused: boolean;
  retentionHours: number;
}

export interface ActivitySample {
  id: string;
  applicationId: string;
  startedAt: string;
  lastSeenAt: string;
}

export interface ActivitySuggestion {
  id: string;
  applicationId: string;
  startedAt: string;
  endedAt: string;
  suggestedActivity: string;
  suggestedTagId: string | null;
  ruleApplied: boolean;
}

export interface ActivityRule {
  applicationId: string;
  activity: string;
  defaultTagId: string | null;
}

export interface ActivityAssistState {
  preferences: ActivityAssistPreferences;
  exclusions: string[];
  recentSamples: ActivitySample[];
  pendingSuggestions: ActivitySuggestion[];
  rules: ActivityRule[];
  sampleCount: number;
  collectorAvailable: boolean;
}
