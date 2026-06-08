import React from "react";
import { useTimer } from "../hooks/use-timer";
import { useSession } from "../hooks/use-session";
import { Button } from "@memo/ui";

interface DashboardProps {
  userId: string;
  intervalMinutes?: number;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Dashboard({
  userId,
  intervalMinutes = 30,
}: DashboardProps) {
  const timer = useTimer();
  const { activeSession, startSession, endSession } = useSession();

  async function handleStart() {
    timer.start();
    await startSession(userId, intervalMinutes);
  }

  async function handleStop() {
    timer.stop();
    await endSession();
  }

  function handlePause() {
    timer.pause();
  }

  function handleResume() {
    timer.resume();
  }

  const isSessionActive = activeSession !== null;

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Timer display */}
      <div className="text-center" data-testid="timer-display">
        <div
          className="text-6xl font-bold tabular-nums tracking-tight text-gray-900"
          data-testid="timer-value"
        >
          {formatElapsed(timer.elapsed)}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {timer.isPaused
            ? "Paused"
            : timer.isRunning
              ? "Running"
              : "Ready"}
        </p>
      </div>

      {/* Control buttons */}
      <div className="flex justify-center gap-3" data-testid="timer-controls">
        {!timer.isRunning && (
          <Button
            variant="primary"
            size="lg"
            onClick={handleStart}
            data-testid="start-button"
          >
            Start
          </Button>
        )}

        {timer.isRunning && !timer.isPaused && (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={handlePause}
              data-testid="pause-button"
            >
              Pause
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={handleStop}
              data-testid="stop-button"
            >
              Stop
            </Button>
          </>
        )}

        {timer.isPaused && (
          <>
            <Button
              variant="primary"
              size="lg"
              onClick={handleResume}
              data-testid="resume-button"
            >
              Resume
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={handleStop}
              data-testid="stop-button"
            >
              Stop
            </Button>
          </>
        )}
      </div>

      {/* Session info */}
      {isSessionActive && (
        <div
          className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          data-testid="session-info"
        >
          <h4 className="text-sm font-semibold text-gray-700">
            Current Session
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            Started at{" "}
            <span className="font-medium" data-testid="session-start-time">
              {formatDate(activeSession.started_at)}
            </span>
          </p>
          <p className="text-sm text-gray-600">
            Interval:{" "}
            <span className="font-medium">
              {activeSession.interval_minutes} min
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
