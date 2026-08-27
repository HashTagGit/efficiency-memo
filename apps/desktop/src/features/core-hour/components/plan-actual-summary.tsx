import React from "react";
import { useI18n } from "../../../lib/i18n";
import type { PlanActualSummary } from "../analytics";

interface PlanActualSummaryProps {
  summary: PlanActualSummary;
}

export function PlanActualSummary({ summary }: PlanActualSummaryProps) {
  const { t } = useI18n();
  const minutes = t("coreHour.minutes");
  const completion = summary.completionRate === null
    ? t("coreHour.notAvailable")
    : `${summary.completionRate}%`;
  const variance = `${summary.varianceMinutes > 0 ? "+" : ""}${summary.varianceMinutes} ${minutes}`;
  const metrics = [
    { label: t("coreHour.plannedMinutes"), value: `${summary.plannedMinutes} ${minutes}`, tone: "border-t-2 border-dashed border-planned text-planned" },
    { label: t("coreHour.actualMinutes"), value: `${summary.actualMinutes} ${minutes}`, tone: "border-t-2 border-solid border-actual text-actual" },
    { label: t("coreHour.planCompletion"), value: completion, tone: "border-t-2 border-dotted border-focus text-focus" },
    { label: t("coreHour.planVariance"), value: variance, tone: "border-t-4 border-double border-suggested text-suggested" },
  ];

  return (
    <section aria-labelledby="plan-actual-review-heading">
      <h2 id="plan-actual-review-heading" className="text-base font-semibold text-foreground">
        {t("coreHour.planActualReview")}
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className={`min-h-24 bg-surface px-3 py-3 ${metric.tone}`}>
            <dt className="text-xs text-muted">{metric.label}</dt>
            <dd className="mt-2 text-lg font-semibold tabular-nums">{metric.value}</dd>
          </div>
        ))}
      </dl>
      <p className="sr-only">
        {t("coreHour.planCompletionDetail", {
          completed: summary.completedPlans,
          reviewed: summary.reviewedPlans,
        })}
      </p>
    </section>
  );
}
