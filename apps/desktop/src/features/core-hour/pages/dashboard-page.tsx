import React, { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { getCurrentUser } from "../../../lib/auth";
import { Dashboard, formatElapsed } from "../components/dashboard";
import { SessionProvider, useSession } from "../hooks/use-session";
import { TagsProvider, useTags } from "../hooks/use-tags";
import { useTimer, type TimerState } from "../hooks/use-timer";
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
import { shouldPromptForCheckIn, unrecordedSeconds } from "../session-math";
import { notifyCheckIn } from "../notifications";
import { Button } from "@memo/ui";

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

  return (
    <SessionProvider>
      <TagsProvider>
        <CoreHourWorkspace userId={user.id} />
      </TagsProvider>
    </SessionProvider>
  );
}

function CoreHourWorkspace({ userId }: { userId: string }) {
  const { t } = useI18n();
  const timer = useTimer();
  const { activeSession, pendingCheckIn, loadSessions, saveProgress, createCheckIn } = useSession();
  const { loadTags } = useTags();

  useEffect(() => {
    void loadSessions(userId);
    void loadTags(userId);
  }, [loadSessions, loadTags, userId]);

  useEffect(() => {
    if (activeSession && !timer.isRunning) timer.restore(activeSession.elapsed_seconds);
  }, [activeSession, timer]);

  useEffect(() => {
    if (activeSession && timer.isRunning) saveProgress(timer.elapsed, activeSession.recorded_seconds);
  }, [activeSession, saveProgress, timer.elapsed, timer.isRunning]);

  useEffect(() => {
    if (!activeSession || pendingCheckIn || timer.isPaused) return;
    if (shouldPromptForCheckIn(timer.elapsed, activeSession.recorded_seconds, activeSession.interval_minutes)) {
      timer.pause();
      void createCheckIn(unrecordedSeconds(timer.elapsed, activeSession.recorded_seconds));
      if (document.hidden) {
        void notifyCheckIn(t("coreHour.checkInNotificationTitle"), t("coreHour.checkInNotificationBody"));
      }
    }
  }, [activeSession, createCheckIn, pendingCheckIn, t, timer]);

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
        {activeSession && (
          <div className="flex min-w-0 items-center gap-1">
            <NavLink
              to="/tools/core-hour"
              className="flex min-w-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted hover:bg-surface-strong hover:text-foreground"
            >
              <span className={"h-2 w-2 shrink-0 rounded-full " + (timer.isPaused ? "bg-warning" : "bg-success")} aria-hidden="true" />
              <span className="max-w-44 truncate font-medium">{activeSession.activity || t("today.unnamed")}</span>
              <span className="tabular-nums">{formatElapsed(timer.elapsed)}</span>
            </NavLink>
            <Button
              variant="ghost"
              size="sm"
              onClick={timer.isPaused ? timer.resume : timer.pause}
            >
              {timer.isPaused ? t("coreHour.continue") : t("coreHour.pause")}
            </Button>
          </div>
        )}
      </div>
      <Routes>
        <Route index element={<CoreHourHome timer={timer} />} />
        <Route path="history" element={<HistoryPage userId={userId} />} />
        <Route path="insights" element={<InsightsPage userId={userId} />} />
        <Route path="tags" element={<TagsPage userId={userId} />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </div>
  );
}
