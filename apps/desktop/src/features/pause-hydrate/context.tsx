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
import { observeIdleForNaturalRest } from "./natural-rest";
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
  notificationPermission: ReminderNotificationPermission;
  naturalBreakAvailable: boolean | null;
  refresh: () => Promise<void>;
  requestNotificationPermission: () => Promise<void>;
  savePreferences: (preferences: ReminderPreferenceInput[], policy: SchedulePolicy) => Promise<void>;
  act: (kind: ReminderKind, action: ReminderAction) => Promise<void>;
}

const PauseHydrateContext = createContext<PauseHydrateContextValue | null>(null);

export function PauseHydrateProvider({ children }: { children: React.ReactNode }) {
  const userId = getCurrentUser()?.id ?? null;
  const { t } = useI18n();
  const [state, setState] = useState<PauseHydrateState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<ReminderNotificationPermission>("unknown");
  const [naturalBreakAvailable, setNaturalBreakAvailable] = useState<boolean | null>(null);
  const polling = useRef(false);
  const idleArmed = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setState(await loadPauseHydrateState(userId));
    setLoading(false);
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
    void readSystemIdleSeconds().then((idleSeconds) => {
      if (disposed) return;
      const observation = observeIdleForNaturalRest(false, idleSeconds);
      setNaturalBreakAvailable(observation.available);
      idleArmed.current = observation.armed;
    });
    const tick = async () => {
      if (polling.current) return;
      polling.current = true;
      try {
        const now = new Date();
        const idleSeconds = await readSystemIdleSeconds();
        const observation = observeIdleForNaturalRest(idleArmed.current, idleSeconds);
        setNaturalBreakAvailable(observation.available);
        idleArmed.current = observation.armed;
        if (observation.shouldAttempt
          && idleSeconds !== null
          && await completeNaturalBreak(userId, idleSeconds, now)) {
          idleArmed.current = false;
        }
        const kinds = await markNewPendingReminders(userId, now);
        for (const kind of kinds) {
          await sendReminderNotification(
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
    if (!userId) return;
    await actOnReminder(userId, kind, action);
    await refresh();
  }, [refresh, userId]);

  return (
    <PauseHydrateContext.Provider value={{
      state,
      loading,
      notificationPermission,
      naturalBreakAvailable,
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
