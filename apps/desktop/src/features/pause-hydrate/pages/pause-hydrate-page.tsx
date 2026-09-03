import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, EmptyState, PageHeader } from "@memo/ui";
import { useI18n } from "../../../lib/i18n";
import { usePauseHydrate } from "../context";
import { DEFAULT_SCHEDULE_POLICY } from "../data";
import { dbExecute, dbSelect } from "../../../lib/db";
import { BUILTIN_CHINA_CALENDAR_2026, DEFAULT_WEEKDAY_SCHEDULES, nextDueAt } from "../reminder-logic";
import { parseHolidayCalendar } from "../calendar";
import {
  REMINDER_KINDS,
  type HolidayCalendar,
  type ReminderAction,
  type ReminderKind,
  type ReminderWindow,
  type WeekdaySchedule,
} from "../types";

type DraftPreferences = Record<ReminderKind, { enabled: boolean; intervalMinutes: number }>;

const emptyDraft: DraftPreferences = {
  break: { enabled: false, intervalMinutes: 60 },
  hydration: { enabled: false, intervalMinutes: 45 },
};

interface ScheduleDraft {
  activeWeekdays: number[];
  weekdaySchedules: WeekdaySchedule[];
  calendarEnabled: boolean;
  calendarYear: number;
  calendarData: HolidayCalendar | null;
  naturalBreakEnabled: boolean;
  naturalBreakMinutes: number;
  systemDeferralEnabled: boolean;
  deferralGraceMinutes: number;
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const WEEKDAY_TONES = [
  "weekday-tone-0",
  "weekday-tone-1",
  "weekday-tone-2",
  "weekday-tone-3",
  "weekday-tone-4",
  "weekday-tone-5",
  "weekday-tone-6",
] as const;

const timeInputClass =
  "mt-1.5 h-10 w-full min-w-0 rounded-md border border-control-border bg-background px-3 tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring disabled:opacity-50";

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : Number.NaN;
}

function validWindow(window: ReminderWindow, allowOvernight: boolean): boolean {
  return Number.isInteger(window.startMinute)
    && Number.isInteger(window.endMinute)
    && window.startMinute >= 0
    && window.startMinute <= 1439
    && window.endMinute >= 0
    && window.endMinute <= 1439
    && (allowOvernight ? window.startMinute !== window.endMinute : window.startMinute < window.endMinute);
}

const emptySchedule: ScheduleDraft = {
  activeWeekdays: [...DEFAULT_SCHEDULE_POLICY.activeWeekdays],
  weekdaySchedules: DEFAULT_WEEKDAY_SCHEDULES.map((schedule) => ({
    workWindows: schedule.workWindows.map((window) => ({ ...window })),
    quietWindows: schedule.quietWindows.map((window) => ({ ...window })),
  })),
  calendarEnabled: DEFAULT_SCHEDULE_POLICY.calendarEnabled,
  calendarYear: DEFAULT_SCHEDULE_POLICY.calendarYear,
  calendarData: DEFAULT_SCHEDULE_POLICY.calendarData,
  naturalBreakEnabled: DEFAULT_SCHEDULE_POLICY.naturalBreakEnabled,
  naturalBreakMinutes: DEFAULT_SCHEDULE_POLICY.naturalBreakMinutes,
  systemDeferralEnabled: DEFAULT_SCHEDULE_POLICY.systemDeferralEnabled,
  deferralGraceMinutes: DEFAULT_SCHEDULE_POLICY.deferralGraceMinutes,
};

export default function PauseHydratePage() {
  const { locale, t } = useI18n();
  const {
    state,
    loading,
    loadError,
    notificationPermission,
    naturalBreakAvailable,
    systemInterruption,
    refresh,
    savePreferences,
    act,
    requestNotificationPermission,
  } = usePauseHydrate();
  const [draft, setDraft] = useState<DraftPreferences>(emptyDraft);
  const [schedule, setSchedule] = useState<ScheduleDraft>(emptySchedule);
  const [selectedDay, setSelectedDay] = useState(0);
  const [syncExpanded, setSyncExpanded] = useState(false);
  const [syncTargets, setSyncTargets] = useState<number[]>([]);
  const [syncNotice, setSyncNotice] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [actingKind, setActingKind] = useState<ReminderKind | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [operationError, setOperationError] = useState<"save" | "action" | null>(null);
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    [locale],
  );
  const time = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale],
  );

  useEffect(() => {
    if (!state || dirty) return;
    setDraft({
      break: {
        enabled: state.reminders.break.enabled,
        intervalMinutes: state.reminders.break.intervalMinutes,
      },
      hydration: {
        enabled: state.reminders.hydration.enabled,
        intervalMinutes: state.reminders.hydration.intervalMinutes,
      },
    });
    setSchedule({
      activeWeekdays: [...state.schedulePolicy.activeWeekdays],
      weekdaySchedules: state.schedulePolicy.weekdaySchedules.map((day) => ({
        workWindows: day.workWindows.map((window) => ({ ...window })),
        quietWindows: day.quietWindows.map((window) => ({ ...window })),
      })),
      calendarEnabled: state.schedulePolicy.calendarEnabled,
      calendarYear: state.schedulePolicy.calendarYear,
      calendarData: state.schedulePolicy.calendarData,
      naturalBreakEnabled: state.schedulePolicy.naturalBreakEnabled,
      naturalBreakMinutes: state.schedulePolicy.naturalBreakMinutes,
      systemDeferralEnabled: state.schedulePolicy.systemDeferralEnabled,
      deferralGraceMinutes: state.schedulePolicy.deferralGraceMinutes,
    });
  }, [dirty, state]);

  const selectedSchedule = schedule.weekdaySchedules[selectedDay] ?? DEFAULT_WEEKDAY_SCHEDULES[selectedDay];
  const workInvalid = schedule.weekdaySchedules.some((day) => day.workWindows.some((window) => !validWindow(window, false)));
  const quietInvalid = schedule.weekdaySchedules.some((day) => day.quietWindows.some((window) => !validWindow(window, true)));
  const naturalBreakInvalid = !Number.isInteger(schedule.naturalBreakMinutes)
    || schedule.naturalBreakMinutes < 2
    || schedule.naturalBreakMinutes > 30;
  const deferralGraceInvalid = !Number.isInteger(schedule.deferralGraceMinutes)
    || schedule.deferralGraceMinutes < 1
    || schedule.deferralGraceMinutes > 30;

  function updateDraft(kind: ReminderKind, value: Partial<DraftPreferences[ReminderKind]>) {
    setDraft((current) => ({ ...current, [kind]: { ...current[kind], ...value } }));
    setDirty(true);
    setSaved(false);
    setOperationError(null);
  }

  function updateSchedule(value: Partial<ScheduleDraft>) {
    setSchedule((current) => ({ ...current, ...value }));
    setDirty(true);
    setSaved(false);
    setOperationError(null);
  }

  function updateWindows(kind: "workWindows" | "quietWindows", windows: ReminderWindow[]) {
    setSchedule((current) => ({
      ...current,
      weekdaySchedules: current.weekdaySchedules.map((day, index) => index === selectedDay ? { ...day, [kind]: windows } : day),
    }));
    setDirty(true);
    setSaved(false);
    setOperationError(null);
  }

  function changeWindow(kind: "workWindows" | "quietWindows", index: number, field: "startMinute" | "endMinute", value: string) {
    const windows = selectedSchedule[kind].map((window, windowIndex) => windowIndex === index
      ? { ...window, [field]: timeToMinutes(value) }
      : window);
    updateWindows(kind, windows);
  }

  function addWindow(kind: "workWindows" | "quietWindows") {
    updateWindows(kind, [...selectedSchedule[kind], kind === "workWindows"
      ? { startMinute: 540, endMinute: 1080 }
      : { startMinute: 720, endMinute: 780 }]);
  }

  function removeWindow(kind: "workWindows" | "quietWindows", index: number) {
    updateWindows(kind, selectedSchedule[kind].filter((_, windowIndex) => windowIndex !== index));
  }

  function openSync() {
    setSyncTargets(WEEKDAYS.filter((day) => day !== selectedDay));
    setSyncExpanded(true);
    setSyncNotice(false);
  }

  function applySync() {
    const source = schedule.weekdaySchedules[selectedDay];
    if (!source || syncTargets.length === 0) return;
    setSchedule((current) => ({
      ...current,
      weekdaySchedules: current.weekdaySchedules.map((day, index) => syncTargets.includes(index)
        ? {
            workWindows: source.workWindows.map((window) => ({ ...window })),
            quietWindows: source.quietWindows.map((window) => ({ ...window })),
          }
        : day),
    }));
    setDirty(true);
    setSaved(false);
    setSyncNotice(true);
    setSyncExpanded(false);
  }

  async function handleCalendarYearChange(year: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 9999) return;
    setCalendarError(null);
    let calendarData: HolidayCalendar | null = year === 2026 ? BUILTIN_CHINA_CALENDAR_2026 : null;
    try {
      const [row] = await dbSelect<{ value: string }>("SELECT value FROM ch_settings WHERE key = $1", [`pause_hydrate.calendar.${year}`]);
      if (row) calendarData = parseHolidayCalendar(row.value, year);
    } catch {
      calendarData = null;
    }
    updateSchedule({ calendarYear: year, calendarData });
  }

  async function handleCalendarImport(file: File | undefined) {
    if (!file) return;
    setCalendarError(null);
    try {
      const calendarData = parseHolidayCalendar(await file.text(), schedule.calendarYear);
      await dbExecute(
        "INSERT INTO ch_settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [`pause_hydrate.calendar.${calendarData.year}`, JSON.stringify(calendarData)],
      );
      updateSchedule({ calendarData, calendarYear: calendarData.year });
    } catch (error) {
      setCalendarError(error instanceof Error && error.message === "invalid-calendar-year"
        ? t("pauseHydrate.calendarImportYearMismatch")
        : t("pauseHydrate.calendarImportInvalid"));
    }
  }

  function toggleWeekday(day: number) {
    const active = schedule.activeWeekdays.includes(day);
    if (active && schedule.activeWeekdays.length === 1) return;
    updateSchedule({
      activeWeekdays: active
        ? schedule.activeWeekdays.filter((weekday) => weekday !== day)
        : [...schedule.activeWeekdays, day].sort((a, b) => a - b),
    });
  }

  async function handleSave() {
    if (workInvalid || quietInvalid || naturalBreakInvalid || deferralGraceInvalid) return;
    setSaving(true);
    setOperationError(null);
    try {
      await savePreferences(
        REMINDER_KINDS.map((kind) => ({ kind, ...draft[kind] })),
        {
          activeWeekdays: schedule.activeWeekdays,
          weekdaySchedules: schedule.weekdaySchedules,
          calendarEnabled: schedule.calendarEnabled,
          calendarYear: schedule.calendarYear,
          calendarAvailable: schedule.calendarData?.year === schedule.calendarYear,
          calendarData: schedule.calendarData,
          naturalBreakEnabled: schedule.naturalBreakEnabled,
          naturalBreakMinutes: schedule.naturalBreakMinutes,
          systemDeferralEnabled: schedule.systemDeferralEnabled,
          deferralGraceMinutes: schedule.deferralGraceMinutes,
        },
      );
      setDirty(false);
      setSaved(true);
    } catch {
      setOperationError("save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(kind: ReminderKind, action: ReminderAction) {
    setActingKind(kind);
    setOperationError(null);
    try {
      await act(kind, action);
    } catch {
      setOperationError("action");
    } finally {
      setActingKind(null);
    }
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      await refresh();
    } finally {
      setRetrying(false);
    }
  }

  function nextStatus(kind: ReminderKind): string {
    const reminder = state?.reminders[kind];
    if (!reminder || !draft[kind].enabled) return t("pauseHydrate.off");
    if (reminder.pendingAt) return t("pauseHydrate.dueNow");
    const now = new Date();
    const deferred = schedule.systemDeferralEnabled
      && (state?.systemDeferred || systemInterruption?.notificationsAllowed === false);
    const storedNext = reminder.nextDueAt ? new Date(reminder.nextDueAt) : null;
    const deferralFloor = state?.systemDeferralUntil && new Date(state.systemDeferralUntil) > now
      ? new Date(state.systemDeferralUntil)
      : now;
    const next = deferred && (!storedNext || storedNext <= deferralFloor)
      ? nextDueAt(deferralFloor, reminder.intervalMinutes, state.schedulePolicy)
      : storedNext;
    if (state?.coreHourActive && next && next <= now) {
      return t("pauseHydrate.waitingForFocus");
    }
    return next && Number.isFinite(next.getTime()) ? dateTime.format(next) : t("pauseHydrate.off");
  }

  const permissionDot =
    notificationPermission === "granted" ? "bg-success"
    : notificationPermission === "denied" ? "bg-danger"
    : notificationPermission === "unsupported" ? "bg-muted"
    : "bg-warning";
  const permissionText =
    notificationPermission === "granted" ? t("pauseHydrate.permissionGranted")
    : notificationPermission === "denied" ? t("pauseHydrate.permissionDenied")
    : notificationPermission === "unsupported" ? t("pauseHydrate.permissionUnsupported")
    : t("pauseHydrate.permissionDefault");
  const naturalBreakDot =
    naturalBreakAvailable === true ? "bg-recovery"
    : naturalBreakAvailable === false ? "bg-warning"
    : "bg-muted";
  const naturalBreakStatus =
    naturalBreakAvailable === true ? t("pauseHydrate.naturalBreakReady")
    : naturalBreakAvailable === false ? t("pauseHydrate.naturalBreakUnsupported")
    : t("pauseHydrate.naturalBreakChecking");
  const systemGuardAvailable = systemInterruption !== undefined
    && systemInterruption !== null
    && systemInterruption.reason !== "unsupported";
  const systemGuardBlocked = systemInterruption?.notificationsAllowed === false;
  const systemGuardUnsupported = systemInterruption === null
    || systemInterruption?.reason === "unsupported";
  const systemGraceActive = Boolean(
    state?.systemDeferralUntil
    && new Date(state.systemDeferralUntil).getTime() > Date.now(),
  );
  const systemGuardDot = systemInterruption === undefined || systemGuardUnsupported
    ? "bg-muted"
    : systemGuardBlocked
      ? "bg-warning"
      : "bg-info";
  const systemGuardStatus = systemInterruption === undefined
    ? t("pauseHydrate.systemGuardChecking")
    : systemInterruption === null
      ? state?.systemDeferred
        ? t("pauseHydrate.systemGuardWaiting")
        : systemGraceActive
          ? t("pauseHydrate.systemGuardGrace")
          : t("pauseHydrate.systemGuardUnsupported")
      : systemInterruption.reason === "unsupported"
        ? state?.systemDeferred
          ? t("pauseHydrate.systemGuardRecovery")
          : systemGraceActive
            ? t("pauseHydrate.systemGuardGrace")
            : t("pauseHydrate.systemGuardUnsupported")
      : systemGuardBlocked
        ? t("pauseHydrate.systemGuardBlocked")
        : state?.systemDeferred
          ? t("pauseHydrate.systemGuardRecovery")
          : systemGraceActive
            ? t("pauseHydrate.systemGuardGrace")
          : t("pauseHydrate.systemGuardReady");
  const systemGuardReason = systemGuardBlocked && systemInterruption
    ? t(`pauseHydrate.systemReason.${systemInterruption.reason}`)
    : null;
  const pageHeader = (
    <PageHeader
      title={t("pauseHydrate.title")}
      subtitle={t("pauseHydrate.subtitle")}
      action={
        <div className="max-w-64 border-l-2 border-privacy pl-3">
          <p className="text-xs font-semibold text-privacy">{t("pauseHydrate.localOnly")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t("pauseHydrate.localOnlyHint")}</p>
        </div>
      }
    />
  );

  if (!state) {
    return (
      <div className="mx-auto max-w-5xl space-y-7" data-testid="pause-hydrate-page">
        {pageHeader}
        {loading ? (
          <p className="py-16 text-center text-sm text-muted" role="status" aria-live="polite">{t("pauseHydrate.loading")}</p>
        ) : (
          <EmptyState
            title={t("pauseHydrate.loadErrorTitle")}
            description={t("pauseHydrate.loadErrorDescription")}
            action={<Button isLoading={retrying} onClick={() => void handleRetry()}>{t("pauseHydrate.retry")}</Button>}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7" data-testid="pause-hydrate-page">
      {pageHeader}

      {loadError && (
        <Alert variant="error" title={t("pauseHydrate.loadErrorTitle")}>
          <p>{t("pauseHydrate.refreshErrorDescription")}</p>
          <Button className="mt-3" size="sm" variant="secondary" isLoading={retrying} onClick={() => void handleRetry()}>{t("pauseHydrate.retry")}</Button>
        </Alert>
      )}
      {operationError && (
        <Alert variant="error" title={t("pauseHydrate.operationErrorTitle")}>
          {t(operationError === "save" ? "pauseHydrate.saveErrorDescription" : "pauseHydrate.actionErrorDescription")}
        </Alert>
      )}

      <section aria-labelledby="schedule-heading" className="space-y-5">
        <div>
          <h2 id="schedule-heading" className="text-base font-semibold text-foreground">{t("pauseHydrate.schedule")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t("pauseHydrate.scheduleHint")}</p>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">{t("pauseHydrate.activeDays")}</legend>
          <div className="mt-2 flex flex-wrap rounded-md border border-control-border p-0.5">
            {WEEKDAYS.map((day) => {
              const active = schedule.activeWeekdays.includes(day);
              return (
                <Button
                  key={day}
                  variant="ghost"
                  size="sm"
                  aria-pressed={active}
                  aria-label={t(`pauseHydrate.weekday${day}`)}
                  className={`weekday-day-button ${WEEKDAY_TONES[day]} min-w-12 flex-1 sm:flex-none`}
                  data-active={active}
                  onClick={() => { setSelectedDay(day); toggleWeekday(day); }}
                >
                  {t(`pauseHydrate.weekdayShort${day}`)}
                </Button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              {t("pauseHydrate.editDay")}
              <select
                value={selectedDay}
                onChange={(event) => setSelectedDay(Number(event.target.value))}
                className="h-9 rounded-md border border-control-border bg-background px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
              >
                {WEEKDAYS.map((day) => <option key={day} value={day}>{t(`pauseHydrate.weekday${day}`)}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <label className="inline-flex items-center gap-2 font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={schedule.calendarEnabled}
                  onChange={(event) => updateSchedule({ calendarEnabled: event.target.checked })}
                  className="h-4 w-4 rounded border border-control-border accent-[var(--accent)] focus:ring-2 focus:ring-focus-ring"
                />
                {t("pauseHydrate.calendarEnabled")}
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-control-border px-3 py-1.5 font-medium text-foreground hover:bg-surface-strong">
                <input
                  type="file"
                  accept=".ics,.json,text/calendar,application/json"
                  className="sr-only"
                  onChange={(event) => { void handleCalendarImport(event.target.files?.[0]); event.currentTarget.value = ""; }}
                />
                {t("pauseHydrate.calendarImport")}
              </label>
              <span>{t(schedule.calendarData ? "pauseHydrate.calendarReady" : "pauseHydrate.calendarImportRequired", { year: schedule.calendarYear })}</span>
              <input
                type="number"
                min={2000}
                max={9999}
                value={schedule.calendarYear}
                aria-label={t("pauseHydrate.calendarYear")}
                onChange={(event) => { void handleCalendarYearChange(Number(event.target.value)); }}
                className="h-9 w-24 rounded-md border border-control-border bg-background px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={openSync}>
              {t("pauseHydrate.syncWeekdays")}
            </Button>
            <span className="text-xs text-success" aria-live="polite">{syncNotice ? t("pauseHydrate.syncApplied") : ""}</span>
          </div>
          {syncExpanded && (
            <div className="mt-3 border-l-2 border-accent bg-accent/5 px-4 py-3">
              <p className="text-xs leading-relaxed text-muted">{t("pauseHydrate.syncHint", { day: t(`pauseHydrate.weekday${selectedDay}`) })}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {WEEKDAYS.filter((day) => day !== selectedDay).map((day) => (
                  <label key={day} className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={syncTargets.includes(day)}
                      onChange={(event) => setSyncTargets((current) => event.target.checked
                        ? [...current, day].sort((a, b) => a - b)
                        : current.filter((target) => target !== day))}
                      className="h-4 w-4 rounded border border-control-border accent-[var(--accent)] focus:ring-2 focus:ring-focus-ring"
                    />
                    {t(`pauseHydrate.weekdayShort${day}`)}
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" disabled={syncTargets.length === 0} onClick={applySync}>{t("pauseHydrate.applySync")}</Button>
                <Button variant="ghost" size="sm" onClick={() => setSyncExpanded(false)}>{t("pauseHydrate.cancelSync")}</Button>
              </div>
            </div>
          )}
          {calendarError && <p className="mt-2 text-xs text-danger" role="alert">{calendarError}</p>}
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <fieldset className="min-w-0">
            <legend className="text-sm font-medium text-foreground">{t("pauseHydrate.workHours")}</legend>
            <p className="mt-1 text-xs text-muted">{t("pauseHydrate.dayScheduleHint", { day: t(`pauseHydrate.weekday${selectedDay}`) })}</p>
            <div className="mt-2 space-y-2">
              {selectedSchedule.workWindows.map((window, index) => (
                <div key={`${index}-${window.startMinute}-${window.endMinute}`} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <label className="text-xs text-muted">{t("pauseHydrate.workStart")}<input type="time" value={minutesToTime(window.startMinute)} aria-invalid={workInvalid} onChange={(event) => changeWindow("workWindows", index, "startMinute", event.target.value)} className={timeInputClass} /></label>
                  <label className="text-xs text-muted">{t("pauseHydrate.workEnd")}<input type="time" value={minutesToTime(window.endMinute)} aria-invalid={workInvalid} onChange={(event) => changeWindow("workWindows", index, "endMinute", event.target.value)} className={timeInputClass} /></label>
                  <Button variant="ghost" size="icon" aria-label={t("pauseHydrate.removeWindow")} onClick={() => removeWindow("workWindows", index)}>×</Button>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => addWindow("workWindows")}>+ {t("pauseHydrate.addWindow")}</Button>
            <p className="mt-2 text-xs text-danger" aria-live="polite">{workInvalid ? t("pauseHydrate.workHoursInvalid") : ""}</p>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="text-sm font-medium text-foreground">{t("pauseHydrate.quietHours")}</legend>
            <p className="mt-1 text-xs text-muted">{t("pauseHydrate.quietHoursHint")}</p>
            <div className="mt-2 space-y-2">
              {selectedSchedule.quietWindows.map((window, index) => (
                <div key={`${index}-${window.startMinute}-${window.endMinute}`} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <label className="text-xs text-muted">{t("pauseHydrate.quietStart")}<input type="time" value={minutesToTime(window.startMinute)} aria-invalid={quietInvalid} onChange={(event) => changeWindow("quietWindows", index, "startMinute", event.target.value)} className={timeInputClass} /></label>
                  <label className="text-xs text-muted">{t("pauseHydrate.quietEnd")}<input type="time" value={minutesToTime(window.endMinute)} aria-invalid={quietInvalid} onChange={(event) => changeWindow("quietWindows", index, "endMinute", event.target.value)} className={timeInputClass} /></label>
                  <Button variant="ghost" size="icon" aria-label={t("pauseHydrate.removeWindow")} onClick={() => removeWindow("quietWindows", index)}>×</Button>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => addWindow("quietWindows")}>+ {t("pauseHydrate.addWindow")}</Button>
            <p className="mt-1 text-xs text-danger" aria-live="polite">{quietInvalid ? t("pauseHydrate.quietHoursInvalid") : ""}</p>
          </fieldset>

          <div className="min-w-0">
            <h3 className="text-sm font-medium text-foreground">{t("pauseHydrate.notifications")}</h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-foreground" aria-live="polite">
              <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${permissionDot}`} />
              {permissionText}
            </p>
            {notificationPermission === "unsupported" ? (
              <p className="mt-2 text-xs leading-relaxed text-muted">{t("pauseHydrate.permissionUnsupportedHint")}</p>
            ) : notificationPermission === "granted" ? null : (
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => void requestNotificationPermission()}
              >
                {t(notificationPermission === "denied" ? "pauseHydrate.retryNotifications" : "pauseHydrate.enableNotifications")}
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
            <div className="min-w-0 max-w-xl">
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${naturalBreakDot}`} />
                {t("pauseHydrate.naturalBreak")}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">{t("pauseHydrate.naturalBreakHint")}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted" aria-live="polite">{naturalBreakStatus}</p>
            </div>
            <div className="flex flex-wrap items-start gap-5">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={schedule.naturalBreakEnabled}
                  disabled={naturalBreakAvailable !== true && !schedule.naturalBreakEnabled}
                  onChange={(event) => updateSchedule({ naturalBreakEnabled: event.target.checked })}
                  className="h-4 w-4 rounded border border-control-border accent-[var(--accent)] focus:ring-2 focus:ring-focus-ring disabled:opacity-50"
                />
                {t("pauseHydrate.naturalBreakEnabled")}
              </label>
              <label className="text-xs text-muted">
                {t("pauseHydrate.naturalBreakMinutes")}
                <span className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    min={2}
                    max={30}
                    step={1}
                    disabled={naturalBreakAvailable !== true || !schedule.naturalBreakEnabled}
                    value={schedule.naturalBreakMinutes}
                    aria-invalid={naturalBreakInvalid}
                    onChange={(event) => updateSchedule({ naturalBreakMinutes: Number(event.target.value) })}
                    className="h-10 w-24 min-w-0 rounded-md border border-control-border bg-background px-3 tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring disabled:opacity-50"
                  />
                  <span>{t("coreHour.minutes")}</span>
                </span>
              </label>
            </div>
          </div>
          <p className="mt-2 text-xs text-danger" aria-live="polite">{naturalBreakInvalid ? t("pauseHydrate.naturalBreakInvalid") : ""}</p>
        </div>

        <div className="border-t border-border pt-5">
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
            <div className="min-w-0 max-w-xl">
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${systemGuardDot}`} />
                {t("pauseHydrate.systemGuard")}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">{t("pauseHydrate.systemGuardHint")}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted" aria-live="polite">
                {systemGuardStatus}
                {systemGuardReason ? ` · ${systemGuardReason}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-5">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={schedule.systemDeferralEnabled}
                  disabled={!systemGuardAvailable && !schedule.systemDeferralEnabled}
                  onChange={(event) => updateSchedule({ systemDeferralEnabled: event.target.checked })}
                  className="h-4 w-4 rounded border border-control-border accent-[var(--accent)] focus:ring-2 focus:ring-focus-ring disabled:opacity-50"
                />
                {t("pauseHydrate.systemGuardEnabled")}
              </label>
              <label className="text-xs text-muted">
                {t("pauseHydrate.deferralGrace")}
                <span className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    step={1}
                    disabled={!systemGuardAvailable || !schedule.systemDeferralEnabled}
                    value={schedule.deferralGraceMinutes}
                    aria-invalid={deferralGraceInvalid}
                    onChange={(event) => updateSchedule({ deferralGraceMinutes: Number(event.target.value) })}
                    className="h-10 w-24 min-w-0 rounded-md border border-control-border bg-background px-3 tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring disabled:opacity-50"
                  />
                  <span>{t("coreHour.minutes")}</span>
                </span>
              </label>
            </div>
          </div>
          <p className="mt-2 text-xs text-danger" aria-live="polite">{deferralGraceInvalid ? t("pauseHydrate.deferralGraceInvalid") : ""}</p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {REMINDER_KINDS.map((kind) => {
          const reminder = state.reminders[kind];
          const pending = Boolean(reminder.pendingAt);
          const accent = kind === "break" ? "border-t-recovery" : "border-t-hydration";
          return (
            <section key={kind} className={`rounded-lg border border-border border-t-2 ${accent} bg-surface p-5`} aria-labelledby={`${kind}-heading`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id={`${kind}-heading`} className="text-base font-semibold text-foreground">{t(`pauseHydrate.${kind}`)}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{t(`pauseHydrate.${kind}Description`)}</p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={draft[kind].enabled}
                    onChange={(event) => updateDraft(kind, { enabled: event.target.checked })}
                    className="h-4 w-4 rounded border border-control-border accent-[var(--accent)] focus:ring-2 focus:ring-focus-ring"
                  />
                  {t("pauseHydrate.enabled")}
                </label>
              </div>

              <div className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
                <label className="text-sm font-medium text-foreground">
                  {t("pauseHydrate.interval")}
                  <span className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      min={15}
                      max={240}
                      step={15}
                      disabled={!draft[kind].enabled}
                      value={draft[kind].intervalMinutes}
                      onChange={(event) => updateDraft(kind, { intervalMinutes: Number(event.target.value) })}
                      className="h-10 min-w-0 w-full rounded-md border border-control-border bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring disabled:opacity-50"
                    />
                    <span className="text-xs text-muted">{t("coreHour.minutes")}</span>
                  </span>
                </label>
                <div>
                  <p className="text-xs text-muted">{t("pauseHydrate.completedToday")}</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{state.completedToday[kind]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">{t("pauseHydrate.nextDue")}</p>
                  <p className={`mt-2 text-sm font-semibold ${pending ? "text-warning" : "text-foreground"}`}>{nextStatus(kind)}</p>
                </div>
              </div>

              {pending && (
                <Alert
                  variant={kind === "break" ? "warning" : "info"}
                  title={t(kind === "break" ? "pauseHydrate.pendingBreak" : "pauseHydrate.pendingHydration")}
                  className="mt-5"
                >
                  <p>{t("pauseHydrate.pendingHint")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" disabled={actingKind !== null} onClick={() => void handleAction(kind, "completed")}>{t("pauseHydrate.complete")}</Button>
                    <Button variant="secondary" size="sm" disabled={actingKind !== null} onClick={() => void handleAction(kind, "snoozed")}>{t("pauseHydrate.later")}</Button>
                    <Button variant="ghost" size="sm" disabled={actingKind !== null} onClick={() => void handleAction(kind, "muted")}>{t("pauseHydrate.muteToday")}</Button>
                  </div>
                </Alert>
              )}
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-7">
        <Button isLoading={saving} disabled={loading || workInvalid || quietInvalid || naturalBreakInvalid || deferralGraceInvalid} onClick={() => void handleSave()}>{t("pauseHydrate.saveSettings")}</Button>
        <span className="text-sm text-success" aria-live="polite">{saved ? t("pauseHydrate.saved") : ""}</span>
      </div>

      <section aria-labelledby="today-activity-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="today-activity-heading" className="text-base font-semibold text-foreground">{t("pauseHydrate.todayActivity")}</h2>
          <span className="text-sm tabular-nums text-muted">{state.todayEvents.length}</span>
        </div>
        {state.todayEvents.length === 0 ? (
          <p className="py-8 text-sm text-muted">{t("pauseHydrate.noActivity")}</p>
        ) : (
          <ul className="scrollbar-hidden mt-3 max-h-96 divide-y divide-border overflow-y-auto border-t border-border pr-1">
            {state.todayEvents.map((event) => (
              <li key={event.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3 text-sm">
                <time className="tabular-nums text-muted" dateTime={event.occurredAt}>{time.format(new Date(event.occurredAt))}</time>
                <span className="truncate font-medium text-foreground">{t(`pauseHydrate.${event.kind}`)}</span>
                <span className="text-right text-muted">
                  {event.source === "natural"
                    ? t("pauseHydrate.actionCompletedNatural")
                    : t(`pauseHydrate.action${event.action[0].toUpperCase()}${event.action.slice(1)}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
