import React from "react";
import type { DataCounts } from "../../lib/data-control";
import { useI18n } from "../../lib/i18n";

export function DataSummary({ counts }: { counts: DataCounts }) {
  const { t } = useI18n();
  const metrics = [
    { label: t("dataPrivacy.profiles"), value: counts.profiles, color: "border-privacy text-privacy" },
    { label: t("dataPrivacy.coreHourSessions"), value: counts.coreHourSessions, color: "border-actual text-actual" },
    { label: t("dataPrivacy.coreHourPlans"), value: counts.coreHourPlans, color: "border-planned text-planned" },
    { label: t("dataPrivacy.coreHourTags"), value: counts.coreHourTags, color: "border-focus text-focus" },
    { label: t("dataPrivacy.pauseHydrateEvents"), value: counts.pauseHydrateEvents, color: "border-hydration text-hydration" },
  ];

  return (
    <dl className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={"min-h-24 border-t-2 bg-surface px-4 py-3 " + metric.color}
        >
          <dt className="text-xs leading-snug text-muted">{metric.label}</dt>
          <dd className="mt-3 text-2xl font-semibold tabular-nums">{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}
