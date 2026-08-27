import React, { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { getCurrentUser } from "../../../lib/auth";
import { Dashboard, formatElapsed } from "../components/dashboard";
import { useSession } from "../hooks/use-session";
import type { TimerState } from "../hooks/use-timer";
import HistoryPage from "./history-page";
import InsightsPage from "./insights-page";
import SettingsPage from "./settings-page";
import TagsPage from "./tags-page";
import {
  DEFAULT_DAILY_FOCUS_GOAL,
  loadCheckInInterval,
  loadDailyFocusGoal,
} from "../settings";
import { useI18n } from "../../../lib/i18n";
import { Button, EmptyState } from "@memo/ui";
import { UncertainTimeReview } from "../components/uncertain-time-review";
import { useCoreHourLoadState, useCoreHourTimer } from "../runtime";

function CoreHourHome({ timer }: { timer: TimerState }) {
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(DEFAULT_DAILY_FOCUS_GOAL);

  useEffect(() => {
    void Promise.all([loadCheckInInterval(), loadDailyFocusGoal()]).then(([interval, goal]) => {
      setIntervalMinutes(interval);
      setDailyGoalMinutes(goal);
    });
  }, []);

  const user = getCurrentUser();
  return user ? <Dashboard userId={user.id} intervalMinutes={intervalMinutes} dailyGoalMinutes={dailyGoalMinutes} timer={timer} /> : null;
}

export default function CoreHourRoutes() {
  const user = getCurrentUser();
  if (!user) return null;

  return <CoreHourWorkspace userId={user.id} />;
}

function CoreHourWorkspace({ userId }: { userId: string }) {
  const { t } = useI18n();
  const timer = useCoreHourTimer();
  const { loading, loadError, refresh } = useCoreHourLoadState();
  const { activeSession } = useSession();
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      await refresh();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="ch-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-1">
        <nav className="flex flex-wrap gap-1 text-sm" aria-label={t("coreHour.navigation")}>
            {[
              ["/tools/core-hour", t("coreHour.timer")],
              ["/tools/core-hour/history", t("coreHour.history")],
              ["/tools/core-hour/insights", t("coreHour.insights")],
              ["/tools/core-hour/tags", t("coreHour.tags")],
              ["/tools/core-hour/settings", t("coreHour.settings")],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/tools/core-hour"}
                className={({ isActive }) => `rounded-md px-3 py-2 font-medium transition-colors ${isActive ? "bg-accent text-background" : "text-muted hover:bg-surface-strong hover:text-foreground"}`}
              >
                {label}
              </NavLink>
            ))}
        </nav>
        {!loading && !loadError && activeSession && (
          <div className="flex min-w-0 items-center gap-1">
            <NavLink
              to="/tools/core-hour"
              className="flex min-w-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted hover:bg-surface-strong hover:text-foreground"
            >
              <span className={"h-2 w-2 shrink-0 rounded-full " + (timer.isPaused ? "bg-warning" : "bg-success")} aria-hidden="true" />
              <span className="max-w-44 truncate font-medium">{activeSession.activity || t("today.unnamed")}</span>
              <span className="tabular-nums">{formatElapsed(timer.elapsed)}</span>
            </NavLink>
            {timer.uncertainInterval ? (
              <span className="rounded-md border border-suggested/50 bg-suggested/10 px-2.5 py-1.5 text-xs font-semibold text-suggested">
                {t("coreHour.reviewUncertain")}
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={timer.isPaused ? timer.resume : timer.pause}
              >
                {timer.isPaused ? t("coreHour.continue") : t("coreHour.pause")}
              </Button>
            )}
          </div>
        )}
      </div>
      {loading ? (
        <p className="py-16 text-center text-sm text-muted" role="status" aria-live="polite">{t("coreHour.runtimeLoading")}</p>
      ) : loadError ? (
        <EmptyState
          title={t("coreHour.runtimeLoadErrorTitle")}
          description={t("coreHour.runtimeLoadErrorDescription")}
          action={<Button isLoading={retrying} onClick={() => void handleRetry()}>{t("coreHour.retry")}</Button>}
        />
      ) : <>
      {timer.uncertainInterval && (
        <UncertainTimeReview
          key={timer.uncertainInterval.detectedAt}
          interval={timer.uncertainInterval}
          onResolve={timer.resolveUncertainInterval}
        />
      )}
      <Routes>
        <Route index element={<CoreHourHome timer={timer} />} />
        <Route path="history" element={<HistoryPage userId={userId} />} />
        <Route path="insights" element={<InsightsPage userId={userId} />} />
        <Route path="tags" element={<TagsPage userId={userId} />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
      </>}
    </div>
  );
}
