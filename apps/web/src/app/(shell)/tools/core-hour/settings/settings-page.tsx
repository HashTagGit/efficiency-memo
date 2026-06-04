"use client";

import React, { useState } from "react";

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

export function SettingsPage() {
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a real implementation this would persist to the database
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div data-testid="ch-settings-page" className="space-y-6">
      {/* Check-in interval */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-1">Check-in Interval</h3>
        <p className="text-xs text-muted-foreground mb-4">
          How often CoreHour prompts you for a check-in during an active session.
        </p>

        <div className="flex flex-wrap gap-2">
          {INTERVAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setIntervalMinutes(option.value)}
              data-testid={`ch-interval-${option.value}`}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                intervalMinutes === option.value
                  ? "border-accent bg-accent text-background"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          data-testid="ch-save-settings"
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-strong"
        >
          Save Settings
        </button>
        {saved && (
          <span
            data-testid="ch-settings-saved"
            className="text-sm text-green-600"
          >
            Settings saved!
          </span>
        )}
      </div>
    </div>
  );
}
