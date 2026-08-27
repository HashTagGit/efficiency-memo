import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCurrentUser } from "../../lib/auth";
import { useI18n } from "../../lib/i18n";
import { notifyCheckIn } from "./notifications";
import { SessionProvider, useSession } from "./hooks/use-session";
import { TagsProvider, useTags } from "./hooks/use-tags";
import { useTimer, type TimerState } from "./hooks/use-timer";
import { shouldPromptForCheckIn, unrecordedSeconds } from "./session-math";

const CoreHourTimerContext = createContext<TimerState | null>(null);
interface CoreHourLoadState {
  loading: boolean;
  loadError: boolean;
  refresh: () => Promise<void>;
}

const CoreHourLoadContext = createContext<CoreHourLoadState | null>(null);

function CoreHourRuntime({ children }: { children: React.ReactNode }) {
  const userId = getCurrentUser()?.id ?? null;
  const { t } = useI18n();
  const timer = useTimer();
  const {
    activeSession,
    pendingCheckIn,
    restoredUncertainInterval,
    loadSessions,
    saveProgress,
    createCheckIn,
  } = useSession();
  const { loadTags } = useTags();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      await Promise.all([loadSessions(userId), loadTags(userId)]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [loadSessions, loadTags, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (activeSession && !timer.isRunning) {
      timer.restore(activeSession.elapsed_seconds, restoredUncertainInterval);
    }
  }, [activeSession, restoredUncertainInterval, timer]);

  useEffect(() => {
    if (activeSession && timer.isRunning) {
      saveProgress(
        timer.elapsed,
        activeSession.recorded_seconds,
        timer.uncertainInterval,
      );
    }
  }, [activeSession, saveProgress, timer.elapsed, timer.isRunning, timer.uncertainInterval]);

  useEffect(() => {
    if (!activeSession || pendingCheckIn || timer.isPaused) return;
    if (shouldPromptForCheckIn(timer.elapsed, activeSession.recorded_seconds, activeSession.interval_minutes)) {
      timer.pause();
      void createCheckIn(unrecordedSeconds(timer.elapsed, activeSession.recorded_seconds));
      if (document.hidden || !window.location.pathname.startsWith("/tools/core-hour")) {
        void notifyCheckIn(t("coreHour.checkInNotificationTitle"), t("coreHour.checkInNotificationBody"));
      }
    }
  }, [activeSession, createCheckIn, pendingCheckIn, t, timer]);

  return (
    <CoreHourTimerContext.Provider value={timer}>
      <CoreHourLoadContext.Provider value={{ loading, loadError, refresh }}>
        {children}
      </CoreHourLoadContext.Provider>
    </CoreHourTimerContext.Provider>
  );
}

export function CoreHourRuntimeProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TagsProvider>
        <CoreHourRuntime>{children}</CoreHourRuntime>
      </TagsProvider>
    </SessionProvider>
  );
}

export function useCoreHourTimer(): TimerState {
  const timer = useContext(CoreHourTimerContext);
  if (!timer) throw new Error("useCoreHourTimer must be used within CoreHourRuntimeProvider");
  return timer;
}

export function useCoreHourLoadState(): CoreHourLoadState {
  const state = useContext(CoreHourLoadContext);
  if (!state) throw new Error("useCoreHourLoadState must be used within CoreHourRuntimeProvider");
  return state;
}
