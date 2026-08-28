import React, { useEffect, useState } from "react";
import { Alert, Button, Input, PageHeader } from "@memo/ui";
import {
  DEFAULT_DAILY_FOCUS_GOAL,
  checkInIntervalOptions,
  loadCheckInInterval,
  loadDailyFocusGoal,
  normalizeDailyFocusGoal,
  saveCheckInInterval,
  saveDailyFocusGoal,
} from "../settings";
import { useI18n } from "../../../lib/i18n";
import { getCurrentUser } from "../../../lib/auth";
import {
  loadReviewReminderPreferences,
  saveReviewReminderPreferences,
  type ReviewReminderPreferences,
} from "../review-reminder";
import { requestCoreHourNotifications } from "../notifications";

const defaultReviewReminders: ReviewReminderPreferences = {
  dailyEnabled: false,
  dailyMinute: 1080,
  weeklyEnabled: false,
  weeklyWeekday: 6,
  weeklyMinute: 1080,
  lastDailyLocalDate: null,
  lastWeeklyStartedOn: null,
  pendingDailyLocalDate: null,
  pendingWeekStartedOn: null,
};

function minuteToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function timeToMinute(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  const result = hours * 60 + minutes;
  return Number.isFinite(result) ? result : 0;
}

export default function SettingsPage() {
  const { t } = useI18n();
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(DEFAULT_DAILY_FOCUS_GOAL);
  const [saved, setSaved] = useState(false);
  const [reviewReminders, setReviewReminders] = useState(defaultReviewReminders);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const userId = getCurrentUser()?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!userId) { setLoadError(true); setLoading(false); return; }
    void Promise.all([loadCheckInInterval(), loadDailyFocusGoal(), loadReviewReminderPreferences(userId)])
      .then(([interval, goal, reminders]) => {
        if (cancelled) return;
        setIntervalMinutes(interval);
        setDailyGoalMinutes(goal);
        setReviewReminders(reminders);
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey, userId]);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setSaveError(false);
    setSaved(false);
    const normalizedGoal = normalizeDailyFocusGoal(dailyGoalMinutes);
    try {
      const reminderResult = await saveReviewReminderPreferences(userId, {
        dailyEnabled: reviewReminders.dailyEnabled,
        dailyMinute: reviewReminders.dailyMinute,
        weeklyEnabled: reviewReminders.weeklyEnabled,
        weeklyWeekday: reviewReminders.weeklyWeekday,
        weeklyMinute: reviewReminders.weeklyMinute,
      });
      setReviewReminders(reminderResult.preferences);
      if (reminderResult.newlyEnabled) await requestCoreHourNotifications();
      await Promise.all([
        saveCheckInInterval(intervalMinutes),
        saveDailyFocusGoal(normalizedGoal),
      ]);
      setDailyGoalMinutes(normalizedGoal);
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl" data-testid="ch-settings-page">
      <PageHeader title={t("coreHour.settings")} subtitle={t("settings.description")} />
      {loadError && <Alert variant="error"><p>{t("settings.loadError")}</p><Button className="mt-3" size="sm" variant="secondary" disabled={loading} onClick={() => { setLoading(true); setLoadError(false); setReloadKey((value) => value + 1); }}>{t("coreHour.retry")}</Button></Alert>}
      {saveError && <Alert variant="error">{t("settings.saveError")}</Alert>}
      {loading && <p className="text-sm text-muted" role="status">{t("settings.loading")}</p>}

      <section className="border-t border-border py-6">
        <h2 className="text-base font-semibold text-foreground">{t("coreHour.checkInInterval")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("coreHour.intervalApplies")}</p>
        <div className="mt-4 flex gap-2" role="radiogroup" aria-label={t("coreHour.checkInInterval")}>
          {checkInIntervalOptions.map((minutes) => (
            <Button
              key={minutes}
              variant={intervalMinutes === minutes ? "primary" : "secondary"}
              size="sm"
              role="radio"
              aria-checked={intervalMinutes === minutes}
              onClick={() => { setIntervalMinutes(minutes); setSaved(false); }}
              disabled={loading || saving}
            >
              {minutes} {t("coreHour.minutes")}
            </Button>
          ))}
        </div>
      </section>

      <section className="border-t border-border py-6">
        <h2 className="text-base font-semibold text-foreground">{t("settings.dailyGoal")}</h2>
        <p className="mt-1 text-sm text-muted">{t("settings.dailyGoalHint")}</p>
        <Input
          className="mt-4 max-w-48"
          label={t("settings.goalMinutes")}
          type="number"
          min={15}
          max={720}
          step={15}
          value={dailyGoalMinutes}
          disabled={loading || saving}
          onChange={(event) => { setDailyGoalMinutes(Number(event.target.value)); setSaved(false); }}
        />
      </section>

      <section className="border-t border-border py-6" aria-labelledby="review-reminders-heading">
        <h2 id="review-reminders-heading" className="text-base font-semibold text-foreground">{t("reviewReminder.settingsTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("reviewReminder.settingsHint")}</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="border-l-2 border-focus pl-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input type="checkbox" checked={reviewReminders.dailyEnabled} disabled={loading || saving} onChange={(event) => { setReviewReminders((current) => ({ ...current, dailyEnabled: event.target.checked })); setSaved(false); }} className="h-4 w-4 accent-[var(--accent)] focus:ring-2 focus:ring-focus-ring" />
              {t("reviewReminder.dailyEnabled")}
            </label>
            <label className="mt-3 block text-sm font-medium text-foreground">
              {t("reviewReminder.dailyTime")}
              <input type="time" value={minuteToTime(reviewReminders.dailyMinute)} disabled={!reviewReminders.dailyEnabled || loading || saving} onChange={(event) => { setReviewReminders((current) => ({ ...current, dailyMinute: timeToMinute(event.target.value) })); setSaved(false); }} className="mt-1.5 w-full rounded-md border border-control-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring" />
            </label>
          </div>
          <div className="border-l-2 border-actual pl-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input type="checkbox" checked={reviewReminders.weeklyEnabled} disabled={loading || saving} onChange={(event) => { setReviewReminders((current) => ({ ...current, weeklyEnabled: event.target.checked })); setSaved(false); }} className="h-4 w-4 accent-[var(--accent)] focus:ring-2 focus:ring-focus-ring" />
              {t("reviewReminder.weeklyEnabled")}
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-foreground">
                {t("reviewReminder.weeklyDay")}
                <select value={reviewReminders.weeklyWeekday} disabled={!reviewReminders.weeklyEnabled || loading || saving} onChange={(event) => { setReviewReminders((current) => ({ ...current, weeklyWeekday: Number(event.target.value) })); setSaved(false); }} className="mt-1.5 h-10 w-full rounded-md border border-control-border bg-surface px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring">
                  {Array.from({ length: 7 }, (_, index) => <option key={index} value={index}>{t(`pauseHydrate.weekday${index}`)}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-foreground">
                {t("reviewReminder.weeklyTime")}
                <input type="time" value={minuteToTime(reviewReminders.weeklyMinute)} disabled={!reviewReminders.weeklyEnabled || loading || saving} onChange={(event) => { setReviewReminders((current) => ({ ...current, weeklyMinute: timeToMinute(event.target.value) })); setSaved(false); }} className="mt-1.5 w-full rounded-md border border-control-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring" />
              </label>
            </div>
          </div>
        </div>
        <p className="mt-4 border-l-2 border-privacy pl-3 text-xs leading-relaxed text-muted">{t("reviewReminder.deferralHint")}</p>
      </section>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <Button type="button" isLoading={saving} disabled={loading || loadError} onClick={() => void save()} data-testid="ch-save-settings">{t("coreHour.save")}</Button>
        {saved && <span className="text-sm text-success">{t("coreHour.saved")}</span>}
      </div>
    </div>
  );
}
