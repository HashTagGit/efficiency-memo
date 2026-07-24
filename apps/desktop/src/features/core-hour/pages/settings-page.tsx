import React, { useEffect, useState } from "react";
import { Button } from "@memo/ui";
import { checkInIntervalOptions, loadCheckInInterval, saveCheckInInterval } from "../settings";

export default function SettingsPage() {
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
        <h1 className="text-lg font-semibold">Check-in interval</h1>
        <p className="mt-1 text-sm text-muted-foreground">Applies when you start your next session.</p>
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label="Check-in interval">
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
        <Button type="button" onClick={() => void save()} data-testid="ch-save-settings">Save</Button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </div>
  );
}
