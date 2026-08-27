export const REMINDER_KINDS = ["break", "hydration"] as const;

export type ReminderKind = (typeof REMINDER_KINDS)[number];
export type ReminderAction = "completed" | "snoozed" | "muted";
export type ReminderNotificationPermission = NotificationPermission | "unknown" | "unsupported";

export interface SchedulePolicy {
  activeWeekdays: number[];
  workStartMinute: number;
  workEndMinute: number;
  quietEnabled: boolean;
  quietStartMinute: number;
  quietEndMinute: number;
}

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
  schedulePolicy: SchedulePolicy;
}

export interface ReminderPreferenceInput {
  kind: ReminderKind;
  enabled: boolean;
  intervalMinutes: number;
}
