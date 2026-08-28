import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, EmptyState, PageHeader } from "@memo/ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dbSelect } from "../../../lib/db";
import { useI18n } from "../../../lib/i18n";
import {
  buildActivityRanking,
  buildPlanActualSummary,
  buildTagSlices,
  buildTrend,
  buildWeekSummary,
  isoDay,
  rangeDays,
  summarize,
  weekDays,
  type ActivityRow,
  type DailyRow,
  type TagRow,
  type TrendRange,
} from "../analytics";
import { DEFAULT_DAILY_FOCUS_GOAL, loadDailyFocusGoal } from "../settings";
import { loadPlansForRange, type PlannedBlock } from "../planned-blocks";
import { PlanActualSummary } from "../components/plan-actual-summary";
import { loadSessionsForDays, totalSessionSeconds } from "../today-data";

export default function InsightsPage({ userId }: { userId: string }) {
  const { locale, t } = useI18n();
  const [range, setRange] = useState<TrendRange>("7d");
  const [goalMinutes, setGoalMinutes] = useState(DEFAULT_DAILY_FOCUS_GOAL);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [tagRows, setTagRows] = useState<TagRow[]>([]);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [plans, setPlans] = useState<PlannedBlock[]>([]);
  const [planActualSeconds, setPlanActualSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadFailed(false);
      try {
        const now = new Date();
        const currentWeek = weekDays(now);
        const previousWeek = weekDays(now, -1);
        const planRangeStart = new Date(currentWeek[0] + "T00:00:00");
        const planRangeEnd = new Date(currentWeek[6] + "T00:00:00");
        planRangeEnd.setDate(planRangeEnd.getDate() + 1);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const rangeEnd = isoDay(tomorrow);
        const rangeStart = rangeDays(range, now)[0];
        const dailyStart = rangeStart < previousWeek[0] ? rangeStart : previousWeek[0];
        const [goal, daily, byTag, byActivity, weekPlans, weekSessions] = await Promise.all([
          loadDailyFocusGoal(),
          dbSelect<DailyRow>(
            "SELECT date(ci.checked_at, 'localtime') AS day, SUM(ci.duration_seconds) AS duration_seconds FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id WHERE s.user_id = $1 AND date(ci.checked_at, 'localtime') >= $2 AND date(ci.checked_at, 'localtime') < $3 GROUP BY day ORDER BY day",
            [userId, dailyStart, rangeEnd],
          ),
          dbSelect<TagRow>(
            "SELECT t.id, t.name, t.color, SUM(ci.duration_seconds) AS duration_seconds FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id JOIN ch_check_in_entries e ON e.check_in_id = ci.id JOIN ch_tags t ON t.id = e.tag_id WHERE s.user_id = $1 AND date(ci.checked_at, 'localtime') >= $2 AND date(ci.checked_at, 'localtime') < $3 GROUP BY t.id, t.name, t.color ORDER BY duration_seconds DESC",
            [userId, rangeStart, rangeEnd],
          ),
          dbSelect<ActivityRow>(
            "SELECT COALESCE(NULLIF(trim(s.activity), ''), '') AS name, SUM(ci.duration_seconds) AS duration_seconds FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id WHERE s.user_id = $1 AND date(ci.checked_at, 'localtime') >= $2 AND date(ci.checked_at, 'localtime') < $3 GROUP BY name ORDER BY duration_seconds DESC",
            [userId, currentWeek[0], rangeEnd],
          ),
          loadPlansForRange(userId, planRangeStart, planRangeEnd),
          loadSessionsForDays(userId, currentWeek),
        ]);
        if (cancelled) return;
        setGoalMinutes(goal);
        setDailyRows(daily);
        setTagRows(byTag);
        setActivityRows(byActivity);
        setPlans(weekPlans);
        setPlanActualSeconds(totalSessionSeconds(weekSessions));
        setLoaded(true);
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [range, reloadKey, userId]);

  const trend = buildTrend(dailyRows, range);
  const trendSummary = summarize(trend);
  const week = buildWeekSummary(dailyRows, goalMinutes);
  const planActual = buildPlanActualSummary(plans, planActualSeconds);
  const activities = buildActivityRanking(activityRows);
  const tags = buildTagSlices(tagRows);
  const hasInsightsData = dailyRows.length > 0
    || activityRows.length > 0
    || tagRows.length > 0
    || plans.length > 0
    || planActualSeconds > 0;
  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short" }),
    [locale],
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }),
    [locale],
  );
  const weekChart = week.days.map((point) => ({
    ...point,
    label: dayFormatter.format(new Date(point.day + "T12:00:00")),
  }));
  const weekRange = week.days.length > 0
    ? `${dateFormatter.format(new Date(week.days[0].day + "T12:00:00"))} - ${dateFormatter.format(new Date(week.days[6].day + "T12:00:00"))}`
    : "";
  const maxActivityMinutes = activities[0]?.minutes ?? 0;
  const weekChartMax = Math.ceil((Math.max(goalMinutes, ...week.days.map((point) => point.minutes)) + 15) / 15) * 15;
  const changeLabel = week.changePercent === null
    ? t("insights.noPreviousWeek")
    : t("insights.changeFromLastWeek", {
        change: `${week.changePercent >= 0 ? "+" : ""}${week.changePercent}%`,
      });

  return (
    <div className="mx-auto max-w-6xl space-y-8" data-testid="ch-insights-page">
      <PageHeader title={t("insights.title")} subtitle={t("insights.subtitle", { range: weekRange })} />

      {loaded && loading && (
        <p className="text-sm text-muted" role="status" aria-live="polite">{t("insights.updating")}</p>
      )}
      {loaded && loadFailed && (
        <Alert variant="error" title={t("insights.loadErrorTitle")}>
          <p>{t("insights.refreshErrorDescription")}</p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>{t("insights.retry")}</Button>
        </Alert>
      )}

      {!loaded ? (
        loading ? (
          <p className="py-16 text-center text-sm text-muted" role="status" aria-live="polite">{t("insights.loading")}</p>
        ) : (
          <EmptyState
            title={t("insights.loadErrorTitle")}
            description={t("insights.loadErrorDescription")}
            action={<Button onClick={() => setReloadKey((value) => value + 1)}>{t("insights.retry")}</Button>}
          />
        )
      ) : !hasInsightsData ? (
        <EmptyState
          title={t("insights.emptyTitle")}
          description={t("insights.emptyDescription")}
          action={<Link className="text-sm font-semibold text-accent hover:underline" to="/tools/core-hour">{t("insights.openToday")}</Link>}
        />
      ) : (
      <>

      <section aria-labelledby="weekly-review-heading">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="weekly-review-heading" className="text-base font-semibold text-foreground">{t("insights.weeklyReview")}</h2>
            <p className="mt-1 text-sm text-muted">{t("insights.weeklyReviewHint")}</p>
          </div>
          <span className="text-sm text-muted">{t("insights.dailyTarget", { minutes: goalMinutes })}</span>
        </div>

        <div className="mt-4 grid overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-3 sm:divide-x sm:divide-border">
          <div className="px-4 py-3">
            <p className="text-xs text-muted">{t("insights.thisWeek")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{week.totalMinutes} {t("coreHour.minutes")}</p>
          </div>
          <div className="border-t border-border px-4 py-3 sm:border-t-0">
            <p className="text-xs text-muted">{t("insights.comparison")}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{changeLabel}</p>
            <p className="mt-1 text-xs text-muted">{week.previousTotalMinutes} {t("coreHour.minutes")} {t("insights.lastWeek")}</p>
          </div>
          <div className="border-t border-border px-4 py-3 sm:border-t-0">
            <p className="text-xs text-muted">{t("insights.goalDays")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-success">{week.goalDays} / {week.elapsedDays}</p>
          </div>
        </div>

        <div className="mt-5">
          <PlanActualSummary summary={planActual} />
        </div>

        <div className="mt-5 h-64 rounded-lg border border-border bg-surface px-3 py-4" role="img" aria-label={t("insights.weeklyChart")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekChart} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, weekChartMax]} allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
              <Tooltip contentStyle={{ background: "var(--surface-strong)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
              <ReferenceLine y={goalMinutes} stroke="var(--info)" strokeDasharray="4 4" />
              <Bar dataKey="minutes" name={t("coreHour.minutes")} fill="var(--accent)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="sr-only">
          {weekChart.map((point) => <li key={point.day}>{point.label}: {point.minutes} {t("coreHour.minutes")}</li>)}
        </ul>
      </section>

      <section className="border-t border-border pt-7" aria-labelledby="trend-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="trend-heading" className="text-base font-semibold text-foreground">{t("insights.trends")}</h2>
            <p className="mt-1 text-sm text-muted">{t("insights.trendsHint")}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            {t("coreHour.range")}
            <select
              value={range}
              onChange={(event) => setRange(event.target.value as TrendRange)}
              className="rounded-md border border-control-border bg-surface px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
            >
              <option value="7d">{t("coreHour.last7Days")}</option>
              <option value="30d">{t("coreHour.last30Days")}</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            [t("coreHour.total"), `${trendSummary.totalMinutes} ${t("coreHour.minutes")}`],
            [t("coreHour.activeDays"), String(trendSummary.activeDays)],
            [t("coreHour.dailyAverage"), `${trendSummary.dailyAverage} ${t("coreHour.minutes")}`],
          ].map(([label, value]) => (
            <div key={label} className="border-t-2 border-accent bg-surface px-3 py-3">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 h-52 w-full" role="img" aria-label={t("coreHour.minutesPerDay")}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
              <Tooltip contentStyle={{ background: "var(--surface-strong)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
              <Line type="monotone" dataKey="minutes" name={t("coreHour.minutes")} stroke="var(--accent)" strokeWidth={2} dot={{ r: 2, fill: "var(--accent)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ul className="sr-only">
          {trend.map((point) => <li key={point.day}>{point.label}: {point.minutes} {t("coreHour.minutes")}</li>)}
        </ul>
      </section>

      <section className="grid gap-8 border-t border-border pt-7 lg:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("insights.topActivities")}</h2>
          <p className="mt-1 text-sm text-muted">{t("insights.currentWeek")}</p>
          {activities.length > 0 ? (
            <ol className="mt-4 space-y-4">
              {activities.map((activity) => (
                <li key={activity.name}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-foreground">{activity.name || t("today.unnamed")}</span>
                    <span className="shrink-0 tabular-nums text-muted">{activity.minutes} {t("coreHour.minutes")}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background-soft">
                    <div className="h-full rounded-full bg-success" style={{ width: `${maxActivityMinutes === 0 ? 0 : activity.minutes / maxActivityMinutes * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="mt-4 text-sm text-muted">{t("insights.noActivities")}</p>}
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground">{t("coreHour.tagShare")}</h2>
          <p className="mt-1 text-sm text-muted">{t("insights.selectedRange")}</p>
          {tags.length > 0 ? (
            <div className="mt-4 space-y-3">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-foreground">{tag.name}</span>
                  <span className="tabular-nums text-muted">{tag.minutes} {t("coreHour.minutes")}</span>
                  <span className="w-10 text-right tabular-nums text-muted">{tag.percentage}%</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-muted">{t("coreHour.noTaggedCheckIns")}</p>}
        </div>
      </section>
      </>
      )}
    </div>
  );
}
