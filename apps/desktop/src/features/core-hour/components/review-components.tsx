import React from "react";
import { useI18n } from "../../../lib/i18n";
import { REVIEW_OUTCOMES, type ReviewOutcome } from "../review-outcome";

export function ReviewMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`min-h-24 border-t-2 bg-surface px-4 py-3 ${tone}`}>
      <dt className="text-xs leading-snug text-muted">{label}</dt>
      <dd className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export function ReviewOutcomeSelector({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: ReviewOutcome | null;
  disabled: boolean;
  onChange: (value: ReviewOutcome) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label={label}>
      {REVIEW_OUTCOMES.map((outcome) => (
        <label key={outcome} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium ${value === outcome ? "border-accent bg-accent/10 text-foreground" : "border-control-border bg-surface text-muted hover:bg-surface-strong hover:text-foreground"}`}>
          <input
            type="radio"
            name="review-outcome"
            value={outcome}
            checked={value === outcome}
            disabled={disabled}
            onChange={() => onChange(outcome)}
            className="h-4 w-4 accent-[var(--accent)] focus:ring-2 focus:ring-focus-ring"
          />
          {t(`dailyReview.outcome.${outcome}`)}
        </label>
      ))}
    </div>
  );
}
