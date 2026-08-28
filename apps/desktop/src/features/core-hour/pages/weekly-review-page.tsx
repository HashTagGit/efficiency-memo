import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Input, PageHeader } from "@memo/ui";
import { useI18n } from "../../../lib/i18n";
import { useSession } from "../hooks/use-session";
import { useCoreHourTimer } from "../runtime";
import { localWeekRange } from "../review-range";
import type { ReviewOutcome } from "../review-outcome";
import { loadWeeklyReview, saveWeeklyReview, type WeeklyReviewState } from "../weekly-review";
import { ReviewMetric, ReviewOutcomeSelector } from "../components/review-components";
import { ReviewNavigation } from "../components/review-navigation";

export default function WeeklyReviewPage({ userId }: { userId: string }) {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const { activeSession } = useSession();
  const timer = useCoreHourTimer();
  const [today] = useState(() => { const date = new Date(); date.setHours(12, 0, 0, 0); return date; });
  const [selectedDate, setSelectedDate] = useState(today);
  const [state, setState] = useState<WeeklyReviewState | null>(null);
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null);
  const [nextGoalMinutes, setNextGoalMinutes] = useState(120);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setLoadError(false);
    try {
      const next = await loadWeeklyReview(userId, selectedDate);
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

  useEffect(() => { void load(); return () => { requestRef.current += 1; }; }, [load]);

  const goalValid = Number.isInteger(nextGoalMinutes) && nextGoalMinutes >= 15 && nextGoalMinutes <= 720;
  const blockers = Boolean(activeSession || timer.uncertainInterval || (state?.pendingSuggestionCount ?? 0) > 0);
  const currentWeek = localWeekRange(today).weekStartedOn;
  const selectedWeek = localWeekRange(selectedDate).weekStartedOn;
  const earliest = new Date(today); earliest.setDate(earliest.getDate() - 7 * 7);
  const isCurrent = selectedWeek === currentWeek;
  const isEarliest = selectedWeek === localWeekRange(earliest).weekStartedOn;
  const weekStart = new Date(selectedDate); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const dateFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const weekLabel = `${dateFormat.format(weekStart)} - ${dateFormat.format(weekEnd)}`;

  function shiftWeek(weeks: number) {
    if (saving) return;
    setState(null); setOutcome(null); setSaved(false); setSaveError(false);
    setSelectedDate((current) => { const next = new Date(current); next.setDate(next.getDate() + weeks * 7); return next; });
  }

  async function save() {
    if (!state || !outcome || !goalValid || blockers) return;
    setSaving(true); setSaveError(false); setSaved(false);
    try {
      const review = await saveWeeklyReview({
        userId,
        weekStartedOn: state.weekStartedOn,
        outcome,
        nextGoalMinutes,
        startedAt: state.startedAt,
        endedAt: state.endedAt,
        existingId: state.review?.id,
      });
      setState((current) => current?.weekStartedOn === review.weekStartedOn
        ? { ...current, review, currentGoalMinutes: review.nextGoalMinutes }
        : current);
      setOutcome(review.outcome); setNextGoalMinutes(review.nextGoalMinutes); setSaved(true);
    } catch (error) {
      if (String(error).includes("open-items")) await load();
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7" data-testid="weekly-review-page">
      <PageHeader
        title={t("weeklyReview.title")}
        subtitle={t("weeklyReview.subtitle")}
        action={<div className="flex items-center gap-2" aria-label={t("weeklyReview.dateNavigation")}><Button size="icon" variant="secondary" disabled={isEarliest || saving} aria-label={t("weeklyReview.previousWeek")} title={t("weeklyReview.previousWeek")} onClick={() => shiftWeek(-1)}>&larr;</Button><span className="min-w-32 text-center text-sm font-medium text-foreground">{weekLabel}</span><Button size="icon" variant="secondary" disabled={isCurrent || saving} aria-label={t("weeklyReview.nextWeek")} title={t("weeklyReview.nextWeek")} onClick={() => shiftWeek(1)}>&rarr;</Button></div>}
      />
      <ReviewNavigation />
      {loadError && <Alert variant="error" title={t("weeklyReview.loadErrorTitle")}><p>{t(state ? "weeklyReview.refreshErrorDescription" : "weeklyReview.loadErrorDescription")}</p><Button className="mt-3" size="sm" variant="secondary" disabled={saving || loading} onClick={() => void load()}>{t("coreHour.retry")}</Button></Alert>}
      {saveError && <Alert variant="error">{t("weeklyReview.saveError")}</Alert>}
      {saved && <Alert variant="success">{t("weeklyReview.saved")}</Alert>}
      {loading && state && <p className="text-sm text-muted" role="status" aria-live="polite">{t("weeklyReview.updating")}</p>}
      {loading && !state ? <p className="py-16 text-center text-sm text-muted" role="status">{t("weeklyReview.loading")}</p> : state ? <>
        {blockers && <Alert variant="warning" title={t("weeklyReview.resolveFirst")}><div className="space-y-3">{activeSession && <div className="flex items-center justify-between gap-3"><span>{t("dailyReview.activeSessionBlocker")}</span><Button size="sm" variant="secondary" onClick={() => navigate("/tools/core-hour")}>{t("dailyReview.openToday")}</Button></div>}{timer.uncertainInterval && <div className="flex items-center justify-between gap-3"><span>{t("dailyReview.uncertainBlocker")}</span><Button size="sm" variant="secondary" onClick={() => navigate("/tools/core-hour")}>{t("dailyReview.reviewTime")}</Button></div>}{state.pendingSuggestionCount > 0 && <div className="flex items-center justify-between gap-3"><span>{t("weeklyReview.suggestionBlocker", { count: state.pendingSuggestionCount })}</span><Button size="sm" variant="secondary" onClick={() => navigate("/tools/core-hour/assist")}>{t("dailyReview.reviewSuggestions")}</Button></div>}</div></Alert>}
        <section className="border-t border-border pt-6" aria-labelledby="weekly-review-facts-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3"><div><h2 id="weekly-review-facts-heading" className="text-base font-semibold text-foreground">{t("weeklyReview.weekFacts")}</h2><p className="mt-1 text-sm text-muted">{state.weekStartedOn}</p></div><p className="text-sm font-semibold text-actual">{t("weeklyReview.dailyCoverage", { count: state.dailyReviewCount })}</p></div>
          <dl className="mt-4 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            <ReviewMetric label={t("dailyReview.planned")} value={t("dailyReview.minutesValue", { minutes: state.plannedMinutes })} tone="border-planned" />
            <ReviewMetric label={t("dailyReview.actual")} value={t("dailyReview.minutesValue", { minutes: state.actualMinutes })} tone="border-actual" />
            <ReviewMetric label={t("weeklyReview.longestFocus")} value={t("dailyReview.minutesValue", { minutes: state.longestFocusMinutes })} tone="border-focus" />
            <ReviewMetric label={t("weeklyReview.sessions")} value={String(state.sessionCount)} tone="border-suggested" />
            <ReviewMetric label={t("dailyReview.breaks")} value={String(state.breakCount)} tone="border-recovery" />
            <ReviewMetric label={t("dailyReview.hydration")} value={String(state.hydrationCount)} tone="border-hydration" />
            <ReviewMetric label={t("weeklyReview.planCompletion")} value={`${state.completedPlanCount}/${state.planCount}`} tone="border-privacy" />
            <ReviewMetric label={t("weeklyReview.deviceAttention")} value={String(state.deviceAttentionCount)} tone="border-warning" />
          </dl>
          <p className="mt-3 text-sm text-muted">{t("dailyReview.planStatus", { total: state.planCount, completed: state.completedPlanCount, skipped: state.skippedPlanCount, pending: state.pendingPlanCount })}</p>
        </section>
        <section className="border-t border-border pt-6"><h2 className="text-base font-semibold text-foreground">{t("weeklyReview.outcome")}</h2><ReviewOutcomeSelector label={t("weeklyReview.outcome")} value={outcome} disabled={saving} onChange={(value) => { setOutcome(value); setSaved(false); }} /></section>
        <section className="border-t border-border pt-6"><h2 className="text-base font-semibold text-foreground">{t("weeklyReview.nextAdjustment")}</h2><p className="mt-1 text-sm text-muted">{t("weeklyReview.nextAdjustmentHint")}</p><Input className="mt-4 max-w-48" label={t("dailyReview.nextGoal")} type="number" min={15} max={720} step={15} value={nextGoalMinutes} disabled={saving} onChange={(event) => { setNextGoalMinutes(Number(event.target.value)); setSaved(false); }} error={goalValid ? undefined : t("dailyReview.goalError")} /></section>
        <div className="flex items-center gap-3 border-t border-border pt-5"><Button isLoading={saving} disabled={loading || blockers || !outcome || !goalValid} onClick={() => void save()}>{t(state.review ? "weeklyReview.update" : "weeklyReview.complete")}</Button>{state.review && !saved && <span className="text-sm text-muted">{t("weeklyReview.previouslySaved")}</span>}</div>
      </> : null}
    </div>
  );
}
