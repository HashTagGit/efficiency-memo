import React, { useEffect, useState } from "react";
import { Alert, Button } from "@memo/ui";
import { useSession } from "../hooks/use-session";
import { useTags } from "../hooks/use-tags";
import { shouldPromptForCheckIn, unrecordedSeconds } from "../session-math";
import { useTimer } from "../hooks/use-timer";
import { notifyCheckIn, requestCheckInNotifications } from "../notifications";
import { useI18n } from "../../../lib/i18n";

interface DashboardProps {
  userId: string;
  intervalMinutes: number;
}

function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatDuration(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

export function Dashboard({ userId, intervalMinutes }: DashboardProps) {
  const { t } = useI18n();
  const timer = useTimer();
  const { activeSession, pendingCheckIn, loadSessions, startSession, saveProgress, createCheckIn, completeCheckIn, endSession } = useSession();
  const { activeTags, loadTags } = useTags();
  const [selectedTagId, setSelectedTagId] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    void loadSessions(userId);
    void loadTags(userId);
  }, [loadSessions, loadTags, userId]);

  useEffect(() => {
    if (activeSession && !timer.isRunning) {
      timer.restore(activeSession.elapsed_seconds);
    }
  }, [activeSession, timer]);

  useEffect(() => {
    if (!activeSession || !timer.isRunning) return;
    saveProgress(timer.elapsed, activeSession.recorded_seconds);
  }, [activeSession, saveProgress, timer.elapsed, timer.isRunning]);

  useEffect(() => {
    if (!activeSession || pendingCheckIn || timer.isPaused) return;
    if (shouldPromptForCheckIn(timer.elapsed, activeSession.recorded_seconds, activeSession.interval_minutes)) {
      timer.pause();
      void createCheckIn(unrecordedSeconds(timer.elapsed, activeSession.recorded_seconds));
      if (document.hidden) void notifyCheckIn();
    }
  }, [activeSession, createCheckIn, pendingCheckIn, timer]);

  async function handleStart() {
    void requestCheckInNotifications();
    const session = await startSession(userId, intervalMinutes);
    timer.start();
    saveProgress(0, session.recorded_seconds);
  }

  async function handleStop() {
    const recorded = activeSession?.recorded_seconds ?? 0;
    await endSession(timer.elapsed, recorded);
    timer.stop();
  }

  async function handleCompleteCheckIn(tagId: string | null) {
    await completeCheckIn(tagId, note);
    setSelectedTagId("");
    setNote("");
  }

  const tags = activeTags();
  const currentInterval = activeSession?.interval_minutes ?? intervalMinutes;

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center shadow-sm" data-testid="timer-display">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("coreHour.focusSession")}</p>
        <div className="text-6xl font-bold tabular-nums tracking-tight text-foreground" data-testid="timer-value">
          {formatElapsed(timer.elapsed)}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {pendingCheckIn ? t("coreHour.checkInDue") : timer.isPaused ? t("coreHour.paused") : timer.isRunning ? t("coreHour.running") : t("coreHour.ready")}
        </p>
      </div>

      {pendingCheckIn ? (
        <Alert variant="info" title={t("coreHour.whatWereYouDoing")} data-testid="ch-pending-check-in">
          <div className="space-y-4">
          <p className="text-sm">{t("coreHour.recordLast", { duration: formatDuration(pendingCheckIn.duration_seconds) })}</p>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label={t("coreHour.chooseTag")}>
              {tags.map((tag) => (
                <Button
                  key={tag.id}
                  variant={selectedTagId === tag.id ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setSelectedTagId(tag.id)}
                >
                  {tag.name}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("coreHour.createTag")}</p>
          )}
          <label className="block text-sm font-medium">
            {t("coreHour.note")} <span className="font-normal text-muted-foreground">({t("coreHour.optional")})</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("coreHour.addNote")} className="mt-1 min-h-20 w-full rounded-md border bg-background p-2" />
          </label>
          <div className="flex gap-2">
            <Button type="button" disabled={!selectedTagId} onClick={() => void handleCompleteCheckIn(selectedTagId)}>{t("coreHour.saveCheckIn")}</Button>
            <Button type="button" variant="secondary" onClick={() => void handleCompleteCheckIn(null)}>{t("coreHour.skip")}</Button>
          </div>
          </div>
        </Alert>
      ) : (
        <div className="flex flex-wrap justify-center gap-3" data-testid="timer-controls">
          {!activeSession && <Button variant="primary" size="lg" onClick={() => void handleStart()} data-testid="start-button">{t("coreHour.start")}</Button>}
          {activeSession && !timer.isPaused && <>
            <Button variant="secondary" size="lg" onClick={timer.pause} data-testid="pause-button">{t("coreHour.pause")}</Button>
            <Button variant="danger" size="lg" onClick={() => void handleStop()} data-testid="stop-button">{t("coreHour.end")}</Button>
          </>}
          {activeSession && timer.isPaused && <>
            <Button variant="primary" size="lg" onClick={timer.resume} data-testid="resume-button">{t("coreHour.continue")}</Button>
            <Button variant="danger" size="lg" onClick={() => void handleStop()} data-testid="stop-button">{t("coreHour.end")}</Button>
          </>}
        </div>
      )}

      {activeSession && (
        <div className="rounded-lg border border-border bg-surface px-4 py-3" data-testid="session-info">
            <h2 className="text-sm font-semibold">{t("coreHour.currentSession")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("coreHour.intervalHint", { minutes: currentInterval })}</p>
        </div>
      )}
    </div>
  );
}
