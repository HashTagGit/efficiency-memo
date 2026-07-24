import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Web-native timer hook mirroring the Rust Tauri timer behavior.
 *
 * Drift: ±30s is acceptable (no Web Worker / precise scheduling).
 */
export interface TimerState {
  elapsed: number;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  restore: (elapsedSeconds: number) => void;
}

export function useTimer(): TimerState {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<number>(0);

  // Track whether we're paused so the interval callback reads latest value
  const isPausedRef = useRef(false);
  const isRunningRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    tickRef.current = 0;
    setElapsed(0);
    setIsRunning(true);
    setIsPaused(false);
    isPausedRef.current = false;
    isRunningRef.current = true;

    intervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      tickRef.current += 1;
      setElapsed(tickRef.current);
    }, 1000);
  }, [clearTimer]);

  const stopTimer = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    isRunningRef.current = false;
    isPausedRef.current = false;
    setElapsed(0);
    tickRef.current = 0;
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
    isPausedRef.current = true;
  }, []);

  const resumeTimer = useCallback(() => {
    setIsPaused(false);
    isPausedRef.current = false;
  }, []);

  const restoreTimer = useCallback((elapsedSeconds: number) => {
    clearTimer();
    tickRef.current = elapsedSeconds;
    setElapsed(elapsedSeconds);
    setIsRunning(true);
    setIsPaused(true);
    isRunningRef.current = true;
    isPausedRef.current = true;
  }, [clearTimer]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    elapsed,
    isRunning,
    isPaused,
    start: startTimer,
    stop: stopTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    restore: restoreTimer,
  };
}
