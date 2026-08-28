import React, { useState } from "react";
import { Button } from "@memo/ui";
import { useI18n } from "../../lib/i18n";
import type { Tag } from "../core-hour/types";
import type { ActivityRule, ActivitySuggestion } from "./types";

export interface SuggestionValues {
  activity: string;
  tagId: string | null;
  startedAt: string;
  endedAt: string;
  rememberRule: boolean;
}

function localDateTime(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function SuggestionReview({
  suggestion,
  tags,
  busy,
  onAccept,
  onDismiss,
}: {
  suggestion: ActivitySuggestion;
  tags: Tag[];
  busy: boolean;
  onAccept: (values: SuggestionValues) => void;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const [activity, setActivity] = useState(suggestion.suggestedActivity);
  const [tagId, setTagId] = useState(suggestion.suggestedTagId ?? "");
  const [startedAt, setStartedAt] = useState(() => localDateTime(suggestion.startedAt));
  const [endedAt, setEndedAt] = useState(() => localDateTime(suggestion.endedAt));
  const [rememberRule, setRememberRule] = useState(false);
  const validRange = Boolean(startedAt && endedAt && endedAt > startedAt && startedAt.slice(0, 10) === endedAt.slice(0, 10));
  const durationMinutes = Math.max(1, Math.round((Date.parse(suggestion.endedAt) - Date.parse(suggestion.startedAt)) / 60_000));

  return (
    <li className="rounded-md border border-dashed border-suggested/50 bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-suggested">{t("activityAssist.suggestionLabel")}</p>
          <p className="mt-1 font-mono text-sm text-muted">{suggestion.applicationId}</p>
          <p className="mt-1 text-xs text-muted">{t("activityAssist.suggestionBasis", { minutes: durationMinutes })}</p>
          {suggestion.ruleApplied && <p className="mt-1 text-xs font-medium text-privacy">{t("activityAssist.ruleApplied")}</p>}
        </div>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onDismiss}>{t("activityAssist.dismissSuggestion")}</Button>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-medium text-foreground">
          {t("activityAssist.activityLabel")}
          <input
            value={activity}
            maxLength={160}
            disabled={busy}
            onChange={(event) => setActivity(event.target.value)}
            className="mt-1.5 w-full rounded-md border border-control-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
          />
        </label>
        <label className="text-sm font-medium text-foreground">
          {t("activityAssist.tagLabel")}
          <select
            value={tagId}
            disabled={busy}
            onChange={(event) => setTagId(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-md border border-control-border bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
          >
            <option value="">{t("activityAssist.noTag")}</option>
            {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-foreground">
          {t("activityAssist.startedAt")}
          <input
            type="datetime-local"
            value={startedAt}
            disabled={busy}
            onChange={(event) => setStartedAt(event.target.value)}
            className="mt-1.5 w-full rounded-md border border-control-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
          />
        </label>
        <label className="text-sm font-medium text-foreground">
          {t("activityAssist.endedAt")}
          <input
            type="datetime-local"
            value={endedAt}
            disabled={busy}
            onChange={(event) => setEndedAt(event.target.value)}
            className="mt-1.5 w-full rounded-md border border-control-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={rememberRule}
            disabled={busy}
            onChange={(event) => setRememberRule(event.target.checked)}
            className="h-4 w-4 rounded border border-control-border accent-[var(--accent)] focus:ring-2 focus:ring-focus-ring"
          />
          {t(suggestion.ruleApplied ? "activityAssist.updateRuleOnAccept" : "activityAssist.rememberRule")}
        </label>
        <Button
          size="sm"
          isLoading={busy}
          disabled={!activity.trim() || !validRange}
          onClick={() => onAccept({ activity: activity.trim(), tagId: tagId || null, startedAt, endedAt, rememberRule })}
        >
          {t("activityAssist.acceptSuggestion")}
        </Button>
      </div>
      {!validRange && <p className="mt-3 text-sm text-danger" role="alert">{t("activityAssist.invalidRange")}</p>}
    </li>
  );
}

export function ActivityRuleEditor({
  rule,
  tags,
  busy,
  onSave,
  onDelete,
}: {
  rule: ActivityRule;
  tags: Tag[];
  busy: boolean;
  onSave: (values: { activity: string; tagId: string | null }) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [activity, setActivity] = useState(rule.activity);
  const [tagId, setTagId] = useState(rule.defaultTagId ?? "");

  return (
    <li className="grid gap-3 border-t border-border py-4 lg:grid-cols-[minmax(10rem,0.8fr)_minmax(12rem,1fr)_minmax(10rem,0.8fr)_auto] lg:items-end">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{t("activityAssist.application")}</p>
        <p className="mt-1 truncate font-mono text-sm text-foreground">{rule.applicationId}</p>
      </div>
      <label className="text-sm font-medium text-foreground">
        {t("activityAssist.activityLabel")}
        <input
          value={activity}
          maxLength={160}
          disabled={busy}
          onChange={(event) => setActivity(event.target.value)}
          className="mt-1.5 w-full rounded-md border border-control-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
        />
      </label>
      <label className="text-sm font-medium text-foreground">
        {t("activityAssist.tagLabel")}
        <select
          value={tagId}
          disabled={busy}
          onChange={(event) => setTagId(event.target.value)}
          className="mt-1.5 h-10 w-full rounded-md border border-control-border bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
        >
          <option value="">{t("activityAssist.noTag")}</option>
          {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
        </select>
      </label>
      <div className="flex gap-2 lg:justify-end">
        <Button size="sm" isLoading={busy} disabled={!activity.trim()} onClick={() => onSave({ activity: activity.trim(), tagId: tagId || null })}>
          {t("activityAssist.saveRule")}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onDelete}>{t("activityAssist.deleteRule")}</Button>
      </div>
    </li>
  );
}
