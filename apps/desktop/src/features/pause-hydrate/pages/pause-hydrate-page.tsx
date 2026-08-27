import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, PageHeader } from "@memo/ui";
import { useI18n } from "../../../lib/i18n";
import { usePauseHydrate } from "../context";
import { DEFAULT_SCHEDULE_POLICY } from "../data";
import { REMINDER_KINDS, type ReminderAction, type ReminderKind } from "../types";

type DraftPreferences = Record<ReminderKind, { enabled: boolean; intervalMinutes: number }>;

const emptyDraft: DraftPreferences = {
  break: { enabled: false, intervalMinutes: 60 },
  hydration: { enabled: false, intervalMinutes: 45 },
};

interface ScheduleDraft {
  activeWeekdays: number[];
  workStart: string;
  workEnd: string;
  quietEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  naturalBreakEnabled: boolean;
  naturalBreakMinutes: number;
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const timeInputClass =
  "mt-1.5 h-10 w-full min-w-0 rounded-md border border-border bg-background px-3 tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50";

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : Number.NaN;
}

const emptySchedule: ScheduleDraft = {
  activeWeekdays: [...DEFAULT_SCHEDULE_POLICY.activeWeekdays],
  workStart: minutesToTime(DEFAULT_SCHEDULE_POLICY.workStartMinute),
  workEnd: minutesToTime(DEFAULT_SCHEDULE_POLICY.workEndMinute),
  quietEnabled: DEFAULT_SCHEDULE_POLICY.quietEnabled,
  quietStart: minutesToTime(DEFAULT_SCHEDULE_POLICY.quietStartMinute),
  quietEnd: minutesToTime(DEFAULT_SCHEDULE_POLICY.quietEndMinute),
  naturalBreakEnabled: DEFAULT_SCHEDULE_POLICY.naturalBreakEnabled,
  naturalBreakMinutes: DEFAULT_SCHEDULE_POLICY.naturalBreakMinutes,
};

export default function PauseHydratePage() {
  const { locale, t } = useI18n();
  const { state, loading, notificationPermission, naturalBreakAvailable, savePreferences, act, requestNotificationPermission } = usePauseHydrate();
  const [draft, setDraft] = useState<DraftPreferences>(emptyDraft);
  const [schedule, setSchedule] = useState<ScheduleDraft>(emptySchedule);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [actingKind, setActingKind] = useState<ReminderKind | null>(null);
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
      workStart: minutesToTime(state.schedulePolicy.workStartMinute),
      workEnd: minutesToTime(state.schedulePolicy.workEndMinute),
      quietEnabled: state.schedulePolicy.quietEnabled,
      quietStart: minutesToTime(state.schedulePolicy.quietStartMinute),
      quietEnd: minutesToTime(state.schedulePolicy.quietEndMinute),
      naturalBreakEnabled: state.schedulePolicy.naturalBreakEnabled,
      naturalBreakMinutes: state.schedulePolicy.naturalBreakMinutes,
    });
  }, [dirty, state]);

  const workStartMinute = timeToMinutes(schedule.workStart);
  const workEndMinute = timeToMinutes(schedule.workEnd);
  const quietStartMinute = timeToMinutes(schedule.quietStart);
  const quietEndMinute = timeToMinutes(schedule.quietEnd);
  const workInvalid = !Number.isFinite(workStartMinute) || !Number.isFinite(workEndMinute) || workStartMinute >= workEndMinute;
  const quietInvalid = !Number.isFinite(quietStartMinute)
    || !Number.isFinite(quietEndMinute)
    || quietStartMinute === quietEndMinute;
  const naturalBreakInvalid = !Number.isInteger(schedule.naturalBreakMinutes)
    || schedule.naturalBreakMinutes < 2
    || schedule.naturalBreakMinutes > 30;

  function updateDraft(kind: ReminderKind, value: Partial<DraftPreferences[ReminderKind]>) {
    setDraft((current) => ({ ...current, [kind]: { ...current[kind], ...value } }));
    setDirty(true);
    setSaved(false);
  }

  function updateSchedule(value: Partial<ScheduleDraft>) {
    setSchedule((current) => ({ ...current, ...value }));
    setDirty(true);
    setSaved(false);
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
    if (workInvalid || quietInvalid || naturalBreakInvalid) return;
    setSaving(true);
    try {
      await savePreferences(
        REMINDER_KINDS.map((kind) => ({ kind, ...draft[kind] })),
        {
          activeWeekdays: schedule.activeWeekdays,
          workStartMinute,
          workEndMinute,
          quietEnabled: schedule.quietEnabled,
          quietStartMinute,
          quietEndMinute,
          naturalBreakEnabled: schedule.naturalBreakEnabled,
          naturalBreakMinutes: schedule.naturalBreakMinutes,
        },
      );
      setDirty(false);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(kind: ReminderKind, action: ReminderAction) {
    setActingKind(kind);
    try {
      await act(kind, action);
    } finally {
      setActingKind(null);
    }
  }

  function nextStatus(kind: ReminderKind): string {
    const reminder = state?.reminders[kind];
    if (!reminder || !draft[kind].enabled) return t("pauseHydrate.off");
    if (reminder.pendingAt) return t("pauseHydrate.dueNow");
    if (state?.coreHourActive && reminder.nextDueAt && new Date(reminder.nextDueAt) <= new Date()) {
      return t("pauseHydrate.waitingForFocus");
    }
    if (!reminder.nextDueAt) return t("pauseHydrate.off");
    const next = new Date(reminder.nextDueAt);
    return Number.isFinite(next.getTime()) ? dateTime.format(next) : t("pauseHydrate.off");
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

  if (loading || !state) {
    return <p className="py-16 text-center text-sm text-muted">{t("app.loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7" data-testid="pause-hydrate-page">
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

      <section aria-labelledby="schedule-heading" className="space-y-5">
        <div>
          <h2 id="schedule-heading" className="text-base font-semibold text-foreground">{t("pauseHydrate.schedule")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t("pauseHydrate.scheduleHint")}</p>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">{t("pauseHydrate.activeDays")}</legend>
          <div className="mt-2 flex flex-wrap rounded-md border border-border p-0.5">
            {WEEKDAYS.map((day) => {
              const active = schedule.activeWeekdays.includes(day);
              return (
                <Button
                  key={day}
                  variant={active ? "primary" : "ghost"}
                  size="sm"
                  aria-pressed={active}
                  aria-label={t(`pauseHydrate.weekday${day}`)}
                  className="min-w-12 flex-1 sm:flex-none"
                  onClick={() => toggleWeekday(day)}
                >
                  {t(`pauseHydrate.weekdayShort${day}`)}
                </Button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <fieldset className="min-w-0">
            <legend className="text-sm font-medium text-foreground">{t("pauseHydrate.workHours")}</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="text-xs text-muted">
                {t("pauseHydrate.workStart")}
                <input
                  type="time"
                  value={schedule.workStart}
                  aria-invalid={workInvalid}
                  onChange={(event) => updateSchedule({ workStart: event.target.value })}
                  className={timeInputClass}
                />
              </label>
              <label className="text-xs text-muted">
                {t("pauseHydrate.workEnd")}
                <input
                  type="time"
                  value={schedule.workEnd}
                  aria-invalid={workInvalid}
                  onChange={(event) => updateSchedule({ workEnd: event.target.value })}
                  className={timeInputClass}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-danger" aria-live="polite">{workInvalid ? t("pauseHydrate.workHoursInvalid") : ""}</p>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="text-sm font-medium text-foreground">{t("pauseHydrate.quietHours")}</legend>
            <label className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={schedule.quietEnabled}
                onChange={(event) => updateSchedule({ quietEnabled: event.target.checked })}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {t("pauseHydrate.quietHoursEnabled")}
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs text-muted">
                {t("pauseHydrate.quietStart")}
                <input
                  type="time"
                  value={schedule.quietStart}
                  disabled={!schedule.quietEnabled}
                  aria-invalid={quietInvalid}
                  onChange={(event) => updateSchedule({ quietStart: event.target.value })}
                  className={timeInputClass}
                />
              </label>
              <label className="text-xs text-muted">
                {t("pauseHydrate.quietEnd")}
                <input
                  type="time"
                  value={schedule.quietEnd}
                  disabled={!schedule.quietEnabled}
                  aria-invalid={quietInvalid}
                  onChange={(event) => updateSchedule({ quietEnd: event.target.value })}
                  className={timeInputClass}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted">{t("pauseHydrate.quietHoursHint")}</p>
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
                  className="h-4 w-4 accent-[var(--accent)] disabled:opacity-50"
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
                    className="h-10 w-24 min-w-0 rounded-md border border-border bg-background px-3 tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                  />
                  <span>{t("coreHour.minutes")}</span>
                </span>
              </label>
            </div>
          </div>
          <p className="mt-2 text-xs text-danger" aria-live="polite">{naturalBreakInvalid ? t("pauseHydrate.naturalBreakInvalid") : ""}</p>
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
                    className="h-4 w-4 accent-[var(--accent)]"
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
                      className="h-10 min-w-0 w-full rounded-md border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
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
        <Button isLoading={saving} disabled={loading || workInvalid || quietInvalid || naturalBreakInvalid} onClick={() => void handleSave()}>{t("pauseHydrate.saveSettings")}</Button>
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
          <ul className="mt-3 max-h-96 divide-y divide-border overflow-y-auto border-t border-border pr-1">
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
