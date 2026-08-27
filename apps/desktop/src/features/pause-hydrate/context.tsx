import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getCurrentUser } from "../../lib/auth";
import { useI18n } from "../../lib/i18n";
import {
  actOnReminder,
  loadPauseHydrateState,
  markNewPendingReminders,
  saveReminderPreferences,
} from "./data";
import { requestReminderNotifications, sendReminderNotification } from "./notifications";
import type {
  PauseHydrateState,
  ReminderAction,
  ReminderKind,
  ReminderPreferenceInput,
} from "./types";

interface PauseHydrateContextValue {
  state: PauseHydrateState | null;
  loading: boolean;
  refresh: () => Promise<void>;
  savePreferences: (preferences: ReminderPreferenceInput[]) => Promise<void>;
  act: (kind: ReminderKind, action: ReminderAction) => Promise<void>;
}

const PauseHydrateContext = createContext<PauseHydrateContextValue | null>(null);

export function PauseHydrateProvider({ children }: { children: React.ReactNode }) {
  const userId = getCurrentUser()?.id ?? null;
  const { t } = useI18n();
  const [state, setState] = useState<PauseHydrateState | null>(null);
  const [loading, setLoading] = useState(true);
  const polling = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setState(await loadPauseHydrateState(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const tick = async () => {
      if (polling.current) return;
      polling.current = true;
      try {
        const kinds = await markNewPendingReminders(userId);
        for (const kind of kinds) {
          await sendReminderNotification(
            t(`pauseHydrate.${kind}`),
            t(`pauseHydrate.${kind}Notification`),
          );
        }
        await refresh();
      } finally {
        polling.current = false;
      }
    };
    const timer = window.setInterval(() => { void tick(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [refresh, t, userId]);

  const savePreferences = useCallback(async (preferences: ReminderPreferenceInput[]) => {
    if (!userId) return;
    const newlyEnabled = await saveReminderPreferences(userId, preferences);
    if (newlyEnabled) await requestReminderNotifications();
    await refresh();
  }, [refresh, userId]);

  const act = useCallback(async (kind: ReminderKind, action: ReminderAction) => {
    if (!userId) return;
    await actOnReminder(userId, kind, action);
    await refresh();
  }, [refresh, userId]);

  return (
    <PauseHydrateContext.Provider value={{ state, loading, refresh, savePreferences, act }}>
      {children}
    </PauseHydrateContext.Provider>
  );
}

export function usePauseHydrate(): PauseHydrateContextValue {
  const context = useContext(PauseHydrateContext);
  if (!context) throw new Error("usePauseHydrate must be used within PauseHydrateProvider");
  return context;
}
