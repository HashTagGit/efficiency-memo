export const REMINDER_KINDS = ["break", "hydration"] as const;

export type ReminderKind = (typeof REMINDER_KINDS)[number];
export type ReminderAction = "completed" | "snoozed" | "muted";
export type ReminderEventSource = "manual" | "natural";
export type ReminderNotificationPermission = NotificationPermission | "unknown" | "unsupported";

export interface ReminderWindow {
  startMinute: number;
  endMinute: number;
}

export interface WeekdaySchedule {
  workWindows: ReminderWindow[];
  quietWindows: ReminderWindow[];
}

export interface HolidayCalendar {
  year: number;
  holidays: string[];
  workdays: string[];
}

export interface SchedulePolicy {
  activeWeekdays: number[];
  weekdaySchedules: WeekdaySchedule[];
  calendarEnabled: boolean;
  calendarYear: number;
  calendarAvailable: boolean;
  calendarData: HolidayCalendar | null;
  naturalBreakEnabled: boolean;
  naturalBreakMinutes: number;
  systemDeferralEnabled: boolean;
  deferralGraceMinutes: number;
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
  source: ReminderEventSource;
  occurredAt: string;
}

export interface PauseHydrateState {
  reminders: Record<ReminderKind, ReminderState>;
  completedToday: Record<ReminderKind, number>;
  todayEvents: ReminderEvent[];
  coreHourActive: boolean;
  systemDeferred: boolean;
  systemDeferralUntil: string | null;
  schedulePolicy: SchedulePolicy;
}

export interface ReminderPreferenceInput {
  kind: ReminderKind;
  enabled: boolean;
  intervalMinutes: number;
}
