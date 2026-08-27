import React, { useState } from "react";
import { Button, Input } from "@memo/ui";
import { useI18n } from "../../../lib/i18n";
import type { UncertainInterval } from "../timer-gaps";

interface UncertainTimeReviewProps {
  interval: UncertainInterval;
  onResolve: (includedSeconds: number) => void;
}

export function UncertainTimeReview({ interval, onResolve }: UncertainTimeReviewProps) {
  const { t } = useI18n();
  const maxMinutes = Math.floor(interval.durationSeconds / 60);
  const defaultMinutes = Math.min(
    maxMinutes,
    Math.max(0, Math.round(interval.countedSeconds / 60)),
  );
  const [customMinutes, setCustomMinutes] = useState(String(defaultMinutes));

  const reasonKey = interval.reason === "system-idle"
    ? "coreHour.uncertainReasonIdle"
    : "coreHour.uncertainReasonScheduler";

  function formatDuration(totalSeconds: number): string {
    const seconds = Math.max(0, Math.round(totalSeconds));
    if (seconds >= 60) return `${Math.round(seconds / 60)} ${t("coreHour.minutes")}`;
    return `${seconds} ${t("coreHour.seconds")}`;
  }

  function applyCustomMinutes() {
    const parsed = Number.parseInt(customMinutes, 10);
    const minutes = Number.isNaN(parsed) ? 0 : Math.min(maxMinutes, Math.max(0, parsed));
    onResolve(minutes * 60);
  }

  return (
    <section
      aria-labelledby="uncertain-time-review-heading"
      aria-live="assertive"
      className="border-l-4 border-suggested bg-surface px-4 py-4 sm:px-6"
      data-testid="uncertain-time-review"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="uncertain-time-review-heading" className="flex items-center text-base font-semibold text-foreground">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
          {t("coreHour.uncertainTime")}
        </h2>
        <p className="text-sm font-medium text-warning">{t("coreHour.timerPausedForReview")}</p>
      </div>
      <p className="mt-2 text-sm text-muted">{t(reasonKey)}</p>
      <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="border-t-2 border-dashed border-warning bg-background-soft px-3 py-3">
          <dt className="text-xs text-muted">{t("coreHour.uncertainDuration")}</dt>
          <dd className="mt-2 text-lg font-semibold tabular-nums text-warning">
            {formatDuration(interval.durationSeconds)}
          </dd>
        </div>
        <div className="border-t-2 border-solid border-recovery bg-background-soft px-3 py-3">
          <dt className="text-xs text-muted">{t("coreHour.uncertainCounted")}</dt>
          <dd className="mt-2 text-lg font-semibold tabular-nums text-recovery">
            {formatDuration(interval.countedSeconds)}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <Button variant="danger" onClick={() => onResolve(0)}>
          {t("coreHour.discardUncertain")}
        </Button>
        <Button variant="secondary" onClick={() => onResolve(interval.durationSeconds)}>
          {t("coreHour.keepAllUncertain")}
        </Button>
        <div className="w-28">
          <Input
            type="number"
            min={0}
            max={maxMinutes}
            step={1}
            label={t("coreHour.includedMinutes")}
            aria-label={t("coreHour.includedMinutes")}
            value={customMinutes}
            onChange={(event) => setCustomMinutes(event.target.value)}
          />
        </div>
        <Button onClick={applyCustomMinutes}>
          {t("coreHour.applyTrim")}
        </Button>
      </div>
    </section>
  );
}
