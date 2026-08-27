import React, { useEffect, useState } from "react";
import { Button, Input, PageHeader } from "@memo/ui";
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

export default function SettingsPage() {
  const { t } = useI18n();
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(DEFAULT_DAILY_FOCUS_GOAL);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void Promise.all([loadCheckInInterval(), loadDailyFocusGoal()]).then(([interval, goal]) => {
      setIntervalMinutes(interval);
      setDailyGoalMinutes(goal);
    });
  }, []);

  async function save() {
    const normalizedGoal = normalizeDailyFocusGoal(dailyGoalMinutes);
    await Promise.all([
      saveCheckInInterval(intervalMinutes),
      saveDailyFocusGoal(normalizedGoal),
    ]);
    setDailyGoalMinutes(normalizedGoal);
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-2xl" data-testid="ch-settings-page">
      <PageHeader title={t("coreHour.settings")} subtitle={t("settings.description")} />

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
          onChange={(event) => { setDailyGoalMinutes(Number(event.target.value)); setSaved(false); }}
        />
      </section>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <Button type="button" onClick={() => void save()} data-testid="ch-save-settings">{t("coreHour.save")}</Button>
        {saved && <span className="text-sm text-success">{t("coreHour.saved")}</span>}
      </div>
    </div>
  );
}
