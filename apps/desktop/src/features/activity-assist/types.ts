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
}

export interface ActivityAssistState {
  preferences: ActivityAssistPreferences;
  exclusions: string[];
  recentSamples: ActivitySample[];
  pendingSuggestions: ActivitySuggestion[];
  sampleCount: number;
  collectorAvailable: boolean;
}
