import React, { useEffect, useState } from "react";
import { Button } from "@memo/ui";
import { checkInIntervalOptions, loadCheckInInterval, saveCheckInInterval } from "../settings";
import { useI18n } from "../../../lib/i18n";

export default function SettingsPage() {
  const { t } = useI18n();
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadCheckInInterval().then(setIntervalMinutes);
  }, []);

  async function save() {
    await saveCheckInInterval(intervalMinutes);
    setSaved(true);
  }

  return (
    <div className="max-w-xl space-y-5" data-testid="ch-settings-page">
      <div>
        <h1 className="text-lg font-semibold">{t("coreHour.checkInInterval")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("coreHour.intervalApplies")}</p>
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label={t("coreHour.checkInInterval")}>
        {checkInIntervalOptions.map((minutes) => (
          <Button
            key={minutes}
            variant={intervalMinutes === minutes ? "primary" : "secondary"}
            size="sm"
            role="radio"
            aria-checked={intervalMinutes === minutes}
            onClick={() => setIntervalMinutes(minutes)}
          >
            {minutes} min
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={() => void save()} data-testid="ch-save-settings">{t("coreHour.save")}</Button>
        {saved && <span className="text-sm text-success">{t("coreHour.saved")}</span>}
      </div>
    </div>
  );
}
