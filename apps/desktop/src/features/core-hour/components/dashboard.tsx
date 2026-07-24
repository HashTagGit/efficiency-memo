import React, { useEffect, useState } from "react";
import { Alert, Button } from "@memo/ui";
import { useSession } from "../hooks/use-session";
import { useTags } from "../hooks/use-tags";
import { shouldPromptForCheckIn, unrecordedSeconds } from "../session-math";
import { useTimer } from "../hooks/use-timer";
import { notifyCheckIn, requestCheckInNotifications } from "../notifications";

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
      <div className="text-center" data-testid="timer-display">
        <div className="text-6xl font-bold tabular-nums text-foreground" data-testid="timer-value">
          {formatElapsed(timer.elapsed)}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {pendingCheckIn ? "Check-in due" : timer.isPaused ? "Paused" : timer.isRunning ? "Running" : "Ready"}
        </p>
      </div>

      {pendingCheckIn ? (
        <Alert variant="info" title="What were you doing?" data-testid="ch-pending-check-in">
          <div className="space-y-4">
          <p className="text-sm">Record the last {formatDuration(pendingCheckIn.duration_seconds)}.</p>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label="Choose a tag">
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
            <p className="text-sm text-muted-foreground">Create a tag below to categorize this interval, or skip it.</p>
          )}
          <label className="block text-sm font-medium">
            Note <span className="font-normal text-muted-foreground">(optional)</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border bg-background p-2" />
          </label>
          <div className="flex gap-2">
            <Button type="button" disabled={!selectedTagId} onClick={() => void handleCompleteCheckIn(selectedTagId)}>Save check-in</Button>
            <Button type="button" variant="secondary" onClick={() => void handleCompleteCheckIn(null)}>Skip</Button>
          </div>
          </div>
        </Alert>
      ) : (
        <div className="flex justify-center gap-3" data-testid="timer-controls">
          {!activeSession && <Button variant="primary" size="lg" onClick={() => void handleStart()} data-testid="start-button">Start</Button>}
          {activeSession && !timer.isPaused && <>
            <Button variant="secondary" size="lg" onClick={timer.pause} data-testid="pause-button">Pause</Button>
            <Button variant="danger" size="lg" onClick={() => void handleStop()} data-testid="stop-button">End</Button>
          </>}
          {activeSession && timer.isPaused && <>
            <Button variant="primary" size="lg" onClick={timer.resume} data-testid="resume-button">Continue</Button>
            <Button variant="danger" size="lg" onClick={() => void handleStop()} data-testid="stop-button">End</Button>
          </>}
        </div>
      )}

      {activeSession && (
        <div className="border-t pt-4" data-testid="session-info">
          <h2 className="text-sm font-semibold">Current session</h2>
          <p className="mt-1 text-sm text-muted-foreground">Check in every {currentInterval} minutes. Paused time is excluded.</p>
        </div>
      )}
    </div>
  );
}
