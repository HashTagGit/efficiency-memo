import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Input, PageHeader } from "@memo/ui";
import { useI18n } from "../../../lib/i18n";
import { useSession } from "../hooks/use-session";
import { useCoreHourTimer } from "../runtime";
import {
  loadDailyReview,
  saveDailyReview,
  type DailyReviewState,
  type ReviewOutcome,
} from "../daily-review";
import { ReviewMetric, ReviewOutcomeSelector } from "../components/review-components";
import { ReviewNavigation } from "../components/review-navigation";

export default function DailyReviewPage({ userId }: { userId: string }) {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const { activeSession } = useSession();
  const timer = useCoreHourTimer();
  const [state, setState] = useState<DailyReviewState | null>(null);
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null);
  const [nextGoalMinutes, setNextGoalMinutes] = useState(120);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [today] = useState(() => {
    const value = new Date();
    value.setHours(12, 0, 0, 0);
    return value;
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setLoadError(false);
    try {
      const next = await loadDailyReview(userId, selectedDate);
      if (request !== requestRef.current) return;
      setState(next);
      setOutcome(next.review?.outcome ?? null);
      setNextGoalMinutes(next.review?.nextGoalMinutes ?? next.currentGoalMinutes);
    } catch {
      if (request === requestRef.current) setLoadError(true);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [selectedDate, userId]);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  const goalValid = Number.isInteger(nextGoalMinutes) && nextGoalMinutes >= 15 && nextGoalMinutes <= 720;
  const blockers = Boolean(activeSession || timer.uncertainInterval || (state?.pendingSuggestionCount ?? 0) > 0);
  const variance = state ? state.actualMinutes - state.plannedMinutes : 0;
  const earliestDate = new Date(today);
  earliestDate.setDate(earliestDate.getDate() - 6);
  const isToday = selectedDate.getTime() === today.getTime();
  const isEarliest = selectedDate.getTime() === earliestDate.getTime();
  const dateLabel = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", weekday: "short" }).format(selectedDate);

  function shiftDay(days: number) {
    if (saving) return;
    setState(null);
    setOutcome(null);
    setSaved(false);
    setSaveError(false);
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + days);
      return next;
    });
  }

  async function save() {
    if (!state || !outcome || !goalValid || blockers) return;
    setSaving(true);
    setSaveError(false);
    setSaved(false);
    try {
      const review = await saveDailyReview({
        userId,
        localDate: state.localDate,
        outcome,
        nextGoalMinutes,
        startedAt: state.startedAt,
        endedAt: state.endedAt,
        existingId: state.review?.id,
      });
      setState((current) => current?.localDate === review.localDate
        ? { ...current, review, currentGoalMinutes: review.nextGoalMinutes }
        : current);
      setOutcome(review.outcome);
      setNextGoalMinutes(review.nextGoalMinutes);
      setSaved(true);
    } catch (error) {
      if (String(error).includes("open-items")) await load();
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7" data-testid="daily-review-page">
      <PageHeader
        title={t("dailyReview.title")}
        subtitle={t("dailyReview.subtitle")}
        action={(
          <div className="flex items-center gap-2" aria-label={t("dailyReview.dateNavigation")}>
            <Button size="icon" variant="secondary" disabled={isEarliest || saving} aria-label={t("dailyReview.previousDay")} title={t("dailyReview.previousDay")} onClick={() => shiftDay(-1)}>&larr;</Button>
            <span className="min-w-28 text-center text-sm font-medium text-foreground">{dateLabel}</span>
            <Button size="icon" variant="secondary" disabled={isToday || saving} aria-label={t("dailyReview.nextDay")} title={t("dailyReview.nextDay")} onClick={() => shiftDay(1)}>&rarr;</Button>
          </div>
        )}
      />
      <ReviewNavigation />

      {loadError && (
        <Alert variant="error" title={t("dailyReview.loadErrorTitle")}>
          <p>{t(state ? "dailyReview.refreshErrorDescription" : "dailyReview.loadErrorDescription")}</p>
          <Button className="mt-3" size="sm" variant="secondary" disabled={saving || loading} onClick={() => void load()}>{t("coreHour.retry")}</Button>
        </Alert>
      )}
      {saveError && <Alert variant="error">{t("dailyReview.saveError")}</Alert>}
      {saved && <Alert variant="success">{t("dailyReview.saved")}</Alert>}

      {loading && state && <p className="text-sm text-muted" role="status" aria-live="polite">{t("dailyReview.updating")}</p>}
      {loading && !state ? (
        <p className="py-16 text-center text-sm text-muted" role="status" aria-live="polite">{t("dailyReview.loading")}</p>
      ) : state ? (
        <>
          {blockers && (
            <Alert variant="warning" title={t("dailyReview.resolveFirst")}>
              <div className="space-y-3">
                {activeSession && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{t("dailyReview.activeSessionBlocker")}</span>
                    <Button size="sm" variant="secondary" onClick={() => navigate("/tools/core-hour")}>{t("dailyReview.openToday")}</Button>
                  </div>
                )}
                {timer.uncertainInterval && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{t("dailyReview.uncertainBlocker")}</span>
                    <Button size="sm" variant="secondary" onClick={() => navigate("/tools/core-hour")}>{t("dailyReview.reviewTime")}</Button>
                  </div>
                )}
                {state.pendingSuggestionCount > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{t("dailyReview.suggestionBlocker", { count: state.pendingSuggestionCount })}</span>
                    <Button size="sm" variant="secondary" onClick={() => navigate("/tools/core-hour/assist")}>{t("dailyReview.reviewSuggestions")}</Button>
                  </div>
                )}
              </div>
            </Alert>
          )}

          <section className="border-t border-border pt-6" aria-labelledby="daily-review-facts-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 id="daily-review-facts-heading" className="text-base font-semibold text-foreground">{t("dailyReview.dayFacts")}</h2>
                <p className="mt-1 text-sm text-muted">{state.localDate}</p>
              </div>
              <p className={`text-sm font-semibold tabular-nums ${variance >= 0 ? "text-actual" : "text-warning"}`}>
                {t("dailyReview.variance", { minutes: variance > 0 ? `+${variance}` : variance })}
              </p>
            </div>
            <dl className="mt-4 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              <ReviewMetric label={t("dailyReview.planned")} value={t("dailyReview.minutesValue", { minutes: state.plannedMinutes })} tone="border-planned" />
              <ReviewMetric label={t("dailyReview.actual")} value={t("dailyReview.minutesValue", { minutes: state.actualMinutes })} tone="border-actual" />
              <ReviewMetric label={t("dailyReview.breaks")} value={String(state.breakCount)} tone="border-recovery" />
              <ReviewMetric label={t("dailyReview.hydration")} value={String(state.hydrationCount)} tone="border-hydration" />
            </dl>
            <p className="mt-3 text-sm text-muted">
              {t("dailyReview.planStatus", {
                total: state.planCount,
                completed: state.completedPlanCount,
                skipped: state.skippedPlanCount,
                pending: state.pendingPlanCount,
              })}
            </p>
          </section>

          <section className="border-t border-border pt-6" aria-labelledby="daily-review-outcome-heading">
            <h2 id="daily-review-outcome-heading" className="text-base font-semibold text-foreground">{t("dailyReview.outcome")}</h2>
            <ReviewOutcomeSelector label={t("dailyReview.outcome")} value={outcome} disabled={saving} onChange={(value) => { setOutcome(value); setSaved(false); }} />
          </section>

          <section className="border-t border-border pt-6" aria-labelledby="daily-review-next-heading">
            <h2 id="daily-review-next-heading" className="text-base font-semibold text-foreground">{t("dailyReview.nextAdjustment")}</h2>
            <p className="mt-1 text-sm text-muted">{t("dailyReview.nextAdjustmentHint")}</p>
            <Input
              className="mt-4 max-w-48"
              label={t("dailyReview.nextGoal")}
              type="number"
              min={15}
              max={720}
              step={15}
              value={nextGoalMinutes}
              disabled={saving}
              onChange={(event) => { setNextGoalMinutes(Number(event.target.value)); setSaved(false); }}
              error={goalValid ? undefined : t("dailyReview.goalError")}
            />
          </section>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <Button isLoading={saving} disabled={loading || blockers || !outcome || !goalValid} onClick={() => void save()}>{t(state.review ? "dailyReview.update" : "dailyReview.complete")}</Button>
            {state.review && !saved && <span className="text-sm text-muted">{t("dailyReview.previouslySaved")}</span>}
          </div>
        </>
      ) : null}
    </div>
  );
}
