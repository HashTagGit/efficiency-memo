import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, EmptyState, PageHeader } from "@memo/ui";
import { useI18n } from "../../lib/i18n";
import {
  acceptActivityAssistSuggestion,
  clearActivityAssistSamples,
  dismissActivityAssistSuggestion,
  loadActivityAssistState,
  saveActivityAssistPreferences,
} from "./data";
import { useTags } from "../core-hour/hooks/use-tags";
import type { Tag } from "../core-hour/types";
import type { ActivityAssistPreferences, ActivityAssistState, ActivitySuggestion } from "./types";

const retentionOptions = [24, 48, 72, 168] as const;
const defaultPreferences: ActivityAssistPreferences = {
  enabled: false,
  paused: false,
  retentionHours: 72,
};

function localDateTime(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function SuggestionReview({
  suggestion,
  tags,
  busy,
  onAccept,
  onDismiss,
}: {
  suggestion: ActivitySuggestion;
  tags: Tag[];
  busy: boolean;
  onAccept: (values: { activity: string; tagId: string | null; startedAt: string; endedAt: string }) => void;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const [activity, setActivity] = useState(suggestion.applicationId);
  const [tagId, setTagId] = useState("");
  const [startedAt, setStartedAt] = useState(() => localDateTime(suggestion.startedAt));
  const [endedAt, setEndedAt] = useState(() => localDateTime(suggestion.endedAt));
  const validRange = Boolean(startedAt && endedAt && endedAt > startedAt && startedAt.slice(0, 10) === endedAt.slice(0, 10));

  return (
    <li className="rounded-md border border-dashed border-accent/50 bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-accent">{t("activityAssist.suggestionLabel")}</p>
          <p className="mt-1 font-mono text-sm text-muted">{suggestion.applicationId}</p>
        </div>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onDismiss}>{t("activityAssist.dismissSuggestion")}</Button>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-medium text-foreground">
          {t("activityAssist.activityLabel")}
          <input
            value={activity}
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
      {!validRange && <p className="mt-3 text-sm text-danger" role="alert">{t("activityAssist.invalidRange")}</p>}
      <div className="mt-4 flex justify-end">
        <Button
          size="sm"
          isLoading={busy}
          disabled={!activity.trim() || !validRange}
          onClick={() => onAccept({ activity: activity.trim(), tagId: tagId || null, startedAt, endedAt })}
        >
          {t("activityAssist.acceptSuggestion")}
        </Button>
      </div>
    </li>
  );
}

export default function ActivityAssistPage({ userId }: { userId: string }) {
  const { locale, t } = useI18n();
  const { tags } = useTags();
  const [state, setState] = useState<ActivityAssistState | null>(null);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [newExclusion, setNewExclusion] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [operationError, setOperationError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busySuggestion, setBusySuggestion] = useState<string | null>(null);
  const requestRef = useRef(0);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    setLoadError(false);
    try {
      const next = await loadActivityAssistState(userId);
      if (request !== requestRef.current) return;
      setState(next);
      if (!dirtyRef.current) {
        setPreferences(next.preferences);
        setExclusions(next.exclusions);
      }
    } catch {
      if (request === requestRef.current) setLoadError(true);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 30_000);
    return () => {
      requestRef.current += 1;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    [locale],
  );

  function updatePreferences(value: Partial<ActivityAssistPreferences>) {
    setPreferences((current) => ({ ...current, ...value }));
    setDirty(true);
    setOperationError(false);
  }

  function addExclusion() {
    const value = newExclusion.trim().toLowerCase();
    if (!value || value.length > 128 || exclusions.includes(value)) return;
    setExclusions((current) => [...current, value].sort());
    setNewExclusion("");
    setDirty(true);
    setOperationError(false);
  }

  async function save() {
    setSaving(true);
    setOperationError(false);
    try {
      const next = await saveActivityAssistPreferences(userId, preferences, exclusions);
      setState(next);
      setPreferences(next.preferences);
      setExclusions(next.exclusions);
      setDirty(false);
    } catch {
      setOperationError(true);
    } finally {
      setSaving(false);
    }
  }

  async function clearSamples() {
    setOperationError(false);
    try {
      setState(await clearActivityAssistSamples(userId));
      setConfirmClear(false);
    } catch {
      setOperationError(true);
    }
  }

  async function acceptSuggestion(
    suggestion: ActivitySuggestion,
    values: { activity: string; tagId: string | null; startedAt: string; endedAt: string },
  ) {
    setBusySuggestion(suggestion.id);
    setOperationError(false);
    try {
      setState(await acceptActivityAssistSuggestion({
        userId,
        suggestionId: suggestion.id,
        activity: values.activity,
        defaultTagId: values.tagId,
        startedAt: new Date(values.startedAt).toISOString(),
        endedAt: new Date(values.endedAt).toISOString(),
        startLocalDate: values.startedAt.slice(0, 10),
        endLocalDate: values.endedAt.slice(0, 10),
      }));
    } catch {
      setOperationError(true);
    } finally {
      setBusySuggestion(null);
    }
  }

  async function dismissSuggestion(suggestionId: string) {
    setBusySuggestion(suggestionId);
    setOperationError(false);
    try {
      setState(await dismissActivityAssistSuggestion(userId, suggestionId));
    } catch {
      setOperationError(true);
    } finally {
      setBusySuggestion(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7" data-testid="activity-assist-page">
      <PageHeader title={t("activityAssist.title")} subtitle={t("activityAssist.subtitle")} />

      <Alert variant="info" title={t("activityAssist.privacyTitle")}>
        {t("activityAssist.privacyDescription")}
      </Alert>
      {loadError && (
        <Alert variant="error" title={t("activityAssist.loadErrorTitle")}>
          <p>{t(state ? "activityAssist.refreshErrorDescription" : "activityAssist.loadErrorDescription")}</p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => void refresh()}>{t("coreHour.retry")}</Button>
        </Alert>
      )}
      {operationError && <Alert variant="error">{t("activityAssist.operationError")}</Alert>}

      {loading && !state ? (
        <p className="py-16 text-center text-sm text-muted" role="status" aria-live="polite">{t("activityAssist.loading")}</p>
      ) : state ? (
        <>
          {!state.collectorAvailable && (
            <Alert variant="warning" title={t("activityAssist.unavailableTitle")}>
              {t("activityAssist.unavailableDescription")}
            </Alert>
          )}

          <section className="space-y-4" aria-labelledby="activity-assist-review-heading">
            <div>
              <h2 id="activity-assist-review-heading" className="text-base font-semibold text-foreground">{t("activityAssist.reviewTitle")}</h2>
              <p className="mt-1 text-sm text-muted">{t("activityAssist.reviewHint")}</p>
            </div>
            {state.pendingSuggestions.length === 0 ? (
              <EmptyState className="py-8" title={t("activityAssist.noSuggestions")} description={t("activityAssist.noSuggestionsDescription")} />
            ) : (
              <ul className="space-y-3">
                {state.pendingSuggestions.map((suggestion) => (
                  <SuggestionReview
                    key={suggestion.id}
                    suggestion={suggestion}
                    tags={tags.filter((tag) => !tag.is_archived)}
                    busy={busySuggestion === suggestion.id}
                    onAccept={(values) => void acceptSuggestion(suggestion, values)}
                    onDismiss={() => void dismissSuggestion(suggestion.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-5" aria-labelledby="activity-assist-settings-heading">
            <div>
              <h2 id="activity-assist-settings-heading" className="text-base font-semibold text-foreground">{t("activityAssist.collection")}</h2>
              <p className="mt-1 text-sm text-muted">{t("activityAssist.collectionHint")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={preferences.enabled}
                  disabled={!state.collectorAvailable && !preferences.enabled}
                  onChange={(event) => updatePreferences({ enabled: event.target.checked, paused: event.target.checked ? preferences.paused : false })}
                  className="h-4 w-4 rounded border border-control-border accent-[var(--accent)] focus:ring-2 focus:ring-focus-ring disabled:opacity-50"
                />
                {t("activityAssist.enabled")}
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={preferences.paused}
                  disabled={!preferences.enabled}
                  onChange={(event) => updatePreferences({ paused: event.target.checked })}
                  className="h-4 w-4 rounded border border-control-border accent-[var(--accent)] focus:ring-2 focus:ring-focus-ring disabled:opacity-50"
                />
                {t("activityAssist.paused")}
              </label>
              <label className="text-sm font-medium text-foreground">
                {t("activityAssist.retention")}
                <select
                  value={preferences.retentionHours}
                  onChange={(event) => updatePreferences({ retentionHours: Number(event.target.value) })}
                  className="mt-1.5 h-10 w-full rounded-md border border-control-border bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
                >
                  {retentionOptions.map((hours) => <option key={hours} value={hours}>{t("activityAssist.retentionHours", { hours })}</option>)}
                </select>
              </label>
            </div>
            <Button isLoading={saving} disabled={!dirty} onClick={() => void save()}>{t("activityAssist.save")}</Button>
          </section>

          <section className="border-t border-border pt-6" aria-labelledby="activity-assist-exclusions-heading">
            <h2 id="activity-assist-exclusions-heading" className="text-base font-semibold text-foreground">{t("activityAssist.exclusions")}</h2>
            <p className="mt-1 text-sm text-muted">{t("activityAssist.exclusionsHint")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                value={newExclusion}
                onChange={(event) => setNewExclusion(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") addExclusion(); }}
                placeholder={t("activityAssist.exclusionPlaceholder")}
                className="min-w-56 flex-1 rounded-md border border-control-border bg-background px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
              <Button variant="secondary" disabled={!newExclusion.trim()} onClick={addExclusion}>{t("activityAssist.addExclusion")}</Button>
            </div>
            {exclusions.length > 0 && (
              <ul className="mt-3 divide-y divide-border border-t border-border">
                {exclusions.map((applicationId) => (
                  <li key={applicationId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-mono text-foreground">{applicationId}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setExclusions((current) => current.filter((value) => value !== applicationId)); setDirty(true); setOperationError(false); }}
                    >
                      {t("activityAssist.removeExclusion")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-t border-border pt-6" aria-labelledby="activity-assist-samples-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="activity-assist-samples-heading" className="text-base font-semibold text-foreground">{t("activityAssist.recentSamples")}</h2>
                <p className="mt-1 text-sm text-muted">{t("activityAssist.sampleCount", { count: state.sampleCount })}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => void refresh()}>{t("activityAssist.refresh")}</Button>
                {!confirmClear ? (
                  <Button size="sm" variant="danger" disabled={state.sampleCount === 0} onClick={() => setConfirmClear(true)}>{t("activityAssist.clear")}</Button>
                ) : (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setConfirmClear(false)}>{t("activityAssist.cancel")}</Button>
                    <Button size="sm" variant="danger" onClick={() => void clearSamples()}>{t("activityAssist.confirmClear")}</Button>
                  </>
                )}
              </div>
            </div>
            {state.recentSamples.length === 0 ? (
              <EmptyState className="py-10" title={t("activityAssist.noSamples")} description={t("activityAssist.noSamplesDescription")} />
            ) : (
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {state.recentSamples.map((sample) => (
                  <li key={sample.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
                    <span className="truncate font-mono font-medium text-foreground">{sample.applicationId}</span>
                    <span className="tabular-nums text-muted">
                      {dateTime.format(new Date(sample.startedAt))} - {dateTime.format(new Date(sample.lastSeenAt))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
