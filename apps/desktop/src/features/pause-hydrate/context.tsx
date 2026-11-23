import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getCurrentUser } from "../../lib/auth";
import { useI18n } from "../../lib/i18n";
import {
  actOnReminder,
  completeNaturalBreak,
  loadPauseHydrateState,
  markNewPendingReminders,
  saveReminderPreferences,
} from "./data";
import { readSystemIdleSeconds } from "../../lib/system-idle";
import {
  readSystemInterruptionState,
  type SystemInterruptionState,
} from "../../lib/system-interruption";
import {
  hasReminderPollGap,
  notificationAllowanceForPoll,
  observeIdleForNaturalRest,
} from "./natural-rest";
import {
  reminderNotificationPermission,
  requestReminderNotifications,
  sendReminderNotification,
} from "./notifications";
import type {
  PauseHydrateState,
  ReminderAction,
  ReminderKind,
  ReminderNotificationPermission,
  ReminderPreferenceInput,
  SchedulePolicy,
} from "./types";

interface PauseHydrateContextValue {
  state: PauseHydrateState | null;
  loading: boolean;
  loadError: boolean;
  notificationPermission: ReminderNotificationPermission;
  naturalBreakAvailable: boolean | null;
  systemInterruption: SystemInterruptionState | null | undefined;
  refresh: () => Promise<void>;
  requestNotificationPermission: () => Promise<void>;
  savePreferences: (preferences: ReminderPreferenceInput[], policy: SchedulePolicy) => Promise<void>;
  act: (kind: ReminderKind, action: ReminderAction) => Promise<boolean>;
}

const PauseHydrateContext = createContext<PauseHydrateContextValue | null>(null);

export function PauseHydrateProvider({ children }: { children: React.ReactNode }) {
  const userId = getCurrentUser()?.id ?? null;
  const { t } = useI18n();
  const [state, setState] = useState<PauseHydrateState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<ReminderNotificationPermission>("unknown");
  const [naturalBreakAvailable, setNaturalBreakAvailable] = useState<boolean | null>(null);
  const [systemInterruption, setSystemInterruption] = useState<SystemInterruptionState | null>();
  const polling = useRef(false);
  const idleArmed = useRef(false);
  const lastPollAt = useRef(Date.now());

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    try {
      setState(await loadPauseHydrateState(userId));
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const refreshNotificationPermission = useCallback(async () => {
    setNotificationPermission(await reminderNotificationPermission());
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    setNotificationPermission(await requestReminderNotifications());
  }, []);

  useEffect(() => { void refreshNotificationPermission(); }, [refreshNotificationPermission]);

  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    void Promise.all([readSystemIdleSeconds(), readSystemInterruptionState()]).then(([
      idleSeconds,
      interruption,
    ]) => {
      if (disposed) return;
      const observation = observeIdleForNaturalRest(false, idleSeconds);
      setNaturalBreakAvailable(observation.available);
      idleArmed.current = observation.armed;
      setSystemInterruption(interruption);
    });
    const tick = async () => {
      if (polling.current) return;
      polling.current = true;
      try {
        const now = new Date();
        const deferredAfterGap = hasReminderPollGap(lastPollAt.current, now.getTime());
        lastPollAt.current = now.getTime();
        const [idleSeconds, interruption] = await Promise.all([
          readSystemIdleSeconds(),
          readSystemInterruptionState(),
        ]);
        setSystemInterruption(interruption);
        const observation = observeIdleForNaturalRest(idleArmed.current, idleSeconds);
        setNaturalBreakAvailable(observation.available);
        idleArmed.current = observation.armed;
        if (observation.shouldAttempt
          && idleSeconds !== null
          && await completeNaturalBreak(userId, idleSeconds, now)) {
          idleArmed.current = false;
        }
        const kinds = await markNewPendingReminders(
          userId,
          now,
          notificationAllowanceForPoll(
            interruption?.notificationsAllowed ?? null,
            interruption === null ? null : interruption.reason !== "unsupported",
            deferredAfterGap,
          ),
        );
        for (const kind of kinds) {
          await sendReminderNotification(
            kind,
            t(`pauseHydrate.${kind}`),
            t(`pauseHydrate.${kind}Notification`),
          );
        }
        await refresh();
      } catch (error) {
        console.warn("Pause & Hydrate polling failed.", error);
      } finally {
        polling.current = false;
      }
    };
    const timer = window.setInterval(() => { void tick(); }, 30_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [refresh, t, userId]);

  const savePreferences = useCallback(async (preferences: ReminderPreferenceInput[], policy: SchedulePolicy) => {
    if (!userId) return;
    const newlyEnabled = await saveReminderPreferences(userId, preferences, policy);
    if (newlyEnabled) setNotificationPermission(await requestReminderNotifications());
    await refresh();
  }, [refresh, userId]);

  const act = useCallback(async (kind: ReminderKind, action: ReminderAction) => {
    if (!userId) return false;
    const saved = await actOnReminder(userId, kind, action);
    await refresh();
    return saved;
  }, [refresh, userId]);

  return (
    <PauseHydrateContext.Provider value={{
      state,
      loading,
      loadError,
      notificationPermission,
      naturalBreakAvailable,
      systemInterruption,
      refresh,
      requestNotificationPermission,
      savePreferences,
      act,
    }}>
      {children}
    </PauseHydrateContext.Provider>
  );
}

export function usePauseHydrate(): PauseHydrateContextValue {
  const context = useContext(PauseHydrateContext);
  if (!context) throw new Error("usePauseHydrate must be used within PauseHydrateProvider");
  return context;
}
