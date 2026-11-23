import { useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useNavigate } from "react-router-dom";
import { PET_ASSISTANT_ROUTE } from "../features/pet-assistant";
import { useCoreHourTimer } from "../features/core-hour/runtime";
import { useSession } from "../features/core-hour/hooks/use-session";
import { requestCheckInNotifications } from "../features/core-hour/notifications";
import { loadCheckInInterval } from "../features/core-hour/settings";
import { loadLatestActivity } from "../features/core-hour/today-data";
import { usePauseHydrate } from "../features/pause-hydrate/context";
import { effectiveReminderDueAt } from "../features/pause-hydrate/reminder-logic";
import type { ReminderAction, ReminderKind, ReminderState } from "../features/pause-hydrate/types";
import { getCurrentUser } from "../lib/auth";
import { saveDesktopPetPosition, supportsDesktopPet, type DesktopPetFocus, type DesktopPetPosition } from "../lib/desktop-reminders";
import { useI18n } from "../lib/i18n";

type FocusCommand = "primary-focus" | "start-stop-focus" | "end-focus";
const desktopRoutes = {
  "open-today": "/tools/core-hour",
  "open-pause-hydrate": "/tools/pause-hydrate",
  "open-settings": "/settings",
  "open-daily-review": "/tools/core-hour/review",
  "open-weekly-review": "/tools/core-hour/review/week",
  "open-pet-assistant": PET_ASSISTANT_ROUTE,
} as const;
type DesktopCommand = FocusCommand | keyof typeof desktopRoutes;
type FocusAction = "start-latest" | "pause" | "resume" | "end" | "review" | "none";

interface DesktopCompanionInput {
  focusStatus: string;
  focusAction: string;
  endFocus: string;
  endFocusEnabled: boolean;
  breakStatus: string;
  hydrationStatus: string;
  showApp: string;
  openToday: string;
  openPauseHydrate: string;
  openSettings: string;
  showPet: string;
  quit: string;
  tooltip: string;
}

function formatTrayElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function resolveFocusAction(
  command: FocusCommand,
  state: { active: boolean; paused: boolean; reviewRequired: boolean },
): FocusAction {
  if (!state.active) return command === "end-focus" ? "none" : "start-latest";
  if (state.reviewRequired) return "review";
  if (command === "start-stop-focus" || command === "end-focus") return "end";
  return state.paused ? "resume" : "pause";
}

export function resolveDesktopPetFocus(state: {
  active: boolean; running: boolean; paused: boolean; reviewRequired: boolean;
}): DesktopPetFocus {
  if (!state.active) return "idle";
  if (state.reviewRequired) return "waiting";
  return state.running && !state.paused ? "working" : "paused";
}

export function DesktopCompanionBridge() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const timer = useCoreHourTimer();
  const { activeSession, pendingCheckIn, startSession, endSession } = useSession();
  const {
    state: pauseHydrate,
    systemInterruption,
    refresh: refreshPauseHydrate,
    act: actOnPauseHydrate,
  } = usePauseHydrate();
  const commandHandler = useRef<(command: DesktopCommand) => void>(() => undefined);
  const focusCommandBusy = useRef(false);
  const savingPetPosition = useRef(Promise.resolve());
  const updatingPetFocus = useRef(Promise.resolve());
  const petFocus = resolveDesktopPetFocus({
    active: Boolean(activeSession), running: timer.isRunning, paused: timer.isPaused,
    reviewRequired: Boolean(pendingCheckIn || timer.uncertainInterval),
  });

  useEffect(() => {
    if (!supportsDesktopPet()) return;
    updatingPetFocus.current = updatingPetFocus.current.then(() => invoke<void>("set_desktop_pet_focus", { focus: petFocus }))
      .catch((error) => console.warn("Desktop pet focus state could not be updated.", error));
  }, [petFocus]);
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale],
  );

  const openReview = () => {
    navigate("/tools/core-hour");
    void invoke("show_main_window");
  };

  const startLatest = async () => {
    if (focusCommandBusy.current) return;
    focusCommandBusy.current = true;
    try {
      const user = getCurrentUser();
      if (!user) return;
      const [latest, intervalMinutes] = await Promise.all([
        loadLatestActivity(user.id),
        loadCheckInInterval(),
      ]);
      if (!latest) {
        openReview();
        return;
      }
      void requestCheckInNotifications();
      await startSession({
        userId: user.id,
        intervalMinutes,
        activity: latest.activity,
        defaultTagId: latest.default_tag_id,
        favorite: latest.is_favorite,
      });
      timer.start();
      await refreshPauseHydrate();
    } catch (error) {
      console.warn("The latest CoreHour activity could not be started.", error);
      openReview();
    } finally {
      focusCommandBusy.current = false;
    }
  };

  const endCurrent = async () => {
    if (!activeSession || focusCommandBusy.current) return;
    focusCommandBusy.current = true;
    try {
      const completed = await endSession(timer.elapsed, activeSession.recorded_seconds);
      if (completed) {
        timer.stop();
        await refreshPauseHydrate();
      }
    } catch (error) {
      console.warn("The current CoreHour session could not be ended.", error);
      openReview();
    } finally {
      focusCommandBusy.current = false;
    }
  };

  commandHandler.current = (command) => {
    if (command !== "primary-focus" && command !== "start-stop-focus" && command !== "end-focus") {
      navigate(desktopRoutes[command]);
      return;
    }
    const action = resolveFocusAction(command, {
      active: Boolean(activeSession),
      paused: timer.isPaused,
      reviewRequired: Boolean(pendingCheckIn || timer.uncertainInterval),
    });
    if (action === "start-latest") void startLatest();
    if (action === "pause") timer.pause();
    if (action === "resume") timer.resume();
    if (action === "end") void endCurrent();
    if (action === "review") openReview();
  };

  useEffect(() => {
    let disposed = false;
    let stopListening: (() => void) | undefined;
    void listen<DesktopCommand>("desktop-command", (event) => commandHandler.current(event.payload))
      .then((stop) => {
        if (disposed) stop();
        else stopListening = stop;
      })
      .catch((error) => console.warn("Desktop companion listener is unavailable.", error));
    return () => {
      disposed = true;
      stopListening?.();
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    const unlisten: (() => void)[] = [];
    function register(pending: Promise<() => void>) {
      void pending.then((stop) => {
        if (disposed) stop();
        else unlisten.push(stop);
      }).catch((error) => console.warn("Desktop pet listener is unavailable.", error));
    }
    register(listen<DesktopPetPosition | null>("desktop-pet-position", ({ payload }) => {
      savingPetPosition.current = savingPetPosition.current.then(() => saveDesktopPetPosition(payload))
        .catch((error) => console.warn("Desktop pet position could not be saved.", error));
    }));
    register(listen<{ id: number; kind: ReminderKind; action: Exclude<ReminderAction, "muted"> }>("desktop-pet-reminder-action", async ({ payload }) => {
      let saved = false;
      try {
        if (getCurrentUser() && (payload.kind === "break" || payload.kind === "hydration")
          && (payload.action === "snoozed" || payload.action === "completed")) {
          saved = await actOnPauseHydrate(payload.kind, payload.action);
        }
      } catch (error) {
        console.warn("Desktop pet reminder action could not be saved.", error);
      }
      await invoke("finish_desktop_pet_reminder_action", { id: payload.id, saved })
        .catch((error) => console.warn("Desktop pet reminder action result could not be sent.", error));
    }));
    return () => {
      disposed = true;
      unlisten.forEach((stop) => stop());
    };
  }, [actOnPauseHydrate]);

  const reminderStatus = (reminder: ReminderState | undefined): string => {
    if (!reminder) return t("app.loading");
    if (!reminder.enabled) return t("pauseHydrate.off");
    if (reminder.pendingAt) return t("pauseHydrate.dueNow");
    if (!pauseHydrate?.schedulePolicy) return t("pauseHydrate.dueNow");
    const now = new Date();
    const deferred = pauseHydrate.schedulePolicy.systemDeferralEnabled
      && (pauseHydrate.systemDeferred || systemInterruption?.notificationsAllowed === false);
    const deferralFloor = pauseHydrate.systemDeferralUntil && new Date(pauseHydrate.systemDeferralUntil) > now
      ? new Date(pauseHydrate.systemDeferralUntil)
      : now;
    const otherReminder = pauseHydrate.reminders[reminder.kind === "break" ? "hydration" : "break"];
    const next = effectiveReminderDueAt(
      reminder,
      pauseHydrate.schedulePolicy,
      now,
      otherReminder,
      deferred ? deferralFloor : null,
    );
    if (!next) return t("pauseHydrate.off");
    if (pauseHydrate.coreHourActive && next <= now) {
      return t("pauseHydrate.waitingForFocus");
    }
    return t("desktopCompanion.nextAt", { time: timeFormatter.format(next) });
  };

  const focusState = pendingCheckIn
    ? t("coreHour.checkInDue")
    : timer.uncertainInterval
      ? t("coreHour.uncertainStatus")
      : timer.isPaused
        ? t("coreHour.paused")
        : t("coreHour.running");
  const activity = activeSession?.activity || t("today.unnamed");
  const focusStatus = activeSession
    ? t("desktopCompanion.focusStatus", {
      activity,
      elapsed: formatTrayElapsed(timer.elapsed),
      status: focusState,
    })
    : t("desktopCompanion.noFocus");
  const focusAction = !activeSession
    ? t("desktopCompanion.startLatest")
    : pendingCheckIn || timer.uncertainInterval
      ? t("desktopCompanion.openReview")
      : timer.isPaused
        ? t("desktopCompanion.continueFocus")
        : t("desktopCompanion.pauseFocus");
  const endFocus = t("desktopCompanion.endFocus");
  const endFocusEnabled = Boolean(activeSession && !pendingCheckIn && !timer.uncertainInterval);
  const breakStatus = t("desktopCompanion.reminderStatus", {
    name: t("pauseHydrate.break"),
    status: reminderStatus(pauseHydrate?.reminders.break),
  });
  const hydrationStatus = t("desktopCompanion.reminderStatus", {
    name: t("pauseHydrate.hydration"),
    status: reminderStatus(pauseHydrate?.reminders.hydration),
  });
  const showApp = t("desktopCompanion.showApp");
  const openToday = t("desktopCompanion.openToday");
  const openPauseHydrate = t("desktopCompanion.openPauseHydrate");
  const openSettings = t("desktopCompanion.openSettings");
  const showPet = t("desktopPet.show");
  const quit = t("desktopCompanion.quit");
  const pendingReminder = pauseHydrate?.reminders.break.pendingAt
    ? t("pauseHydrate.break")
    : pauseHydrate?.reminders.hydration.pendingAt
      ? t("pauseHydrate.hydration")
      : null;
  const remindersDeferred = Boolean(
    pauseHydrate?.schedulePolicy.systemDeferralEnabled
    && (pauseHydrate.systemDeferred || systemInterruption?.notificationsAllowed === false),
  );
  const systemGraceActive = Boolean(
    pauseHydrate?.systemDeferralUntil
    && new Date(pauseHydrate.systemDeferralUntil).getTime() > Date.now(),
  );
  const tooltip = pendingReminder
    ? t("desktopCompanion.reminderDue", { name: pendingReminder })
    : remindersDeferred
      ? t("desktopCompanion.systemDeferred")
      : systemGraceActive
        ? t("desktopCompanion.systemGrace")
      : activeSession ? `EfficiencyMemo - ${activity}` : "EfficiencyMemo";

  useEffect(() => {
    const input: DesktopCompanionInput = {
      focusStatus,
      focusAction,
      endFocus,
      endFocusEnabled,
      breakStatus,
      hydrationStatus,
      showApp,
      openToday,
      openPauseHydrate,
      openSettings,
      showPet,
      quit,
      tooltip,
    };
    void invoke("update_desktop_companion", { input })
      .catch((error) => console.warn("Desktop companion status could not be updated.", error));
  }, [breakStatus, endFocus, endFocusEnabled, focusAction, focusStatus, hydrationStatus,
    openPauseHydrate, openSettings, openToday, quit, showApp, showPet, tooltip]);

  return null;
}
