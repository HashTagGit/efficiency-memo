export const REMINDER_KINDS = ["break", "hydration"] as const;

export type ReminderKind = (typeof REMINDER_KINDS)[number];
export type ReminderAction = "completed" | "snoozed" | "muted";

export interface ReminderState {
  kind: ReminderKind;
  enabled: boolean;
  intervalMinutes: number;
  nextDueAt: string | null;
  pendingAt: string | null;
  mutedUntil: string | null;
}

export interface ReminderEvent {
  id: string;
  kind: ReminderKind;
  action: ReminderAction;
  occurredAt: string;
}

export interface PauseHydrateState {
  reminders: Record<ReminderKind, ReminderState>;
  completedToday: Record<ReminderKind, number>;
  todayEvents: ReminderEvent[];
  coreHourActive: boolean;
}

export interface ReminderPreferenceInput {
  kind: ReminderKind;
  enabled: boolean;
  intervalMinutes: number;
}
