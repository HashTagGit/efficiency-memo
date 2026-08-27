import { useState, useRef, useEffect, useCallback } from "react";
import {
  detectSchedulerGap,
  detectSystemIdle,
  resolveUncertainElapsed,
  type UncertainInterval,
} from "../timer-gaps";
import { readSystemIdleSeconds } from "../../../lib/system-idle";

/**
 * Web-native timer hook mirroring the Rust Tauri timer behavior.
 *
 * Scheduling gaps at or above 30 seconds are paused for explicit review.
 */
export interface TimerState {
  elapsed: number;
  isRunning: boolean;
  isPaused: boolean;
  uncertainInterval: UncertainInterval | null;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  restore: (elapsedSeconds: number, uncertainInterval?: UncertainInterval | null) => void;
  resolveUncertainInterval: (includedSeconds: number) => void;
}

export function useTimer(): TimerState {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [uncertainInterval, setUncertainInterval] = useState<UncertainInterval | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<number>(0);
  const lastTickAtRef = useRef(Date.now());
  const uncertainRef = useRef<UncertainInterval | null>(null);

  // Track whether we're paused so the interval callback reads latest value
  const isPausedRef = useRef(false);
  const isRunningRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const flagUncertainInterval = useCallback((interval: UncertainInterval) => {
    if (uncertainRef.current || !isRunningRef.current || isPausedRef.current) return;
    uncertainRef.current = interval;
    setUncertainInterval(interval);
    isPausedRef.current = true;
    setIsPaused(true);
    lastTickAtRef.current = Date.now();
  }, []);

  const scheduleTicks = useCallback(() => {
    clearTimer();
    lastTickAtRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const previousTick = lastTickAtRef.current;
      lastTickAtRef.current = now;
      if (isPausedRef.current) return;
      const gap = detectSchedulerGap(previousTick, now);
      if (gap) {
        flagUncertainInterval(gap);
        return;
      }
      tickRef.current += 1;
      setElapsed(tickRef.current);
    }, 1000);
  }, [clearTimer, flagUncertainInterval]);

  const startTimer = useCallback(() => {
    tickRef.current = 0;
    setElapsed(0);
    setIsRunning(true);
    setIsPaused(false);
    isPausedRef.current = false;
    isRunningRef.current = true;
    uncertainRef.current = null;
    setUncertainInterval(null);
    scheduleTicks();
  }, [scheduleTicks]);

  const stopTimer = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    isRunningRef.current = false;
    isPausedRef.current = false;
    uncertainRef.current = null;
    setUncertainInterval(null);
    setElapsed(0);
    tickRef.current = 0;
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
    isPausedRef.current = true;
    lastTickAtRef.current = Date.now();
  }, []);

  const resumeTimer = useCallback(() => {
    if (uncertainRef.current) return;
    setIsPaused(false);
    isPausedRef.current = false;
    lastTickAtRef.current = Date.now();
  }, []);

  const restoreTimer = useCallback((
    elapsedSeconds: number,
    restoredUncertainInterval: UncertainInterval | null = null,
  ) => {
    tickRef.current = elapsedSeconds;
    setElapsed(elapsedSeconds);
    setIsRunning(true);
    setIsPaused(true);
    isRunningRef.current = true;
    isPausedRef.current = true;
    uncertainRef.current = restoredUncertainInterval;
    setUncertainInterval(restoredUncertainInterval);
    scheduleTicks();
  }, [scheduleTicks]);

  const resolveInterval = useCallback((includedSeconds: number) => {
    const interval = uncertainRef.current;
    if (!interval) return;
    const nextElapsed = resolveUncertainElapsed(
      tickRef.current,
      interval,
      includedSeconds,
    );
    tickRef.current = nextElapsed;
    setElapsed(nextElapsed);
    uncertainRef.current = null;
    setUncertainInterval(null);
    isPausedRef.current = false;
    setIsPaused(false);
    lastTickAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isRunning || isPaused || uncertainInterval) return;
    let cancelled = false;
    let checking = false;
    const poll = async () => {
      if (checking) return;
      checking = true;
      try {
        const idleSeconds = await readSystemIdleSeconds();
        if (cancelled || idleSeconds === null || !isRunningRef.current
          || isPausedRef.current || uncertainRef.current) return;
        const interval = detectSystemIdle(
          idleSeconds,
          tickRef.current,
        );
        if (interval) flagUncertainInterval(interval);
      } finally {
        checking = false;
      }
    };
    const idlePoll = window.setInterval(() => { void poll(); }, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(idlePoll);
    };
  }, [flagUncertainInterval, isPaused, isRunning, uncertainInterval]);

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
    uncertainInterval,
    start: startTimer,
    stop: stopTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    restore: restoreTimer,
    resolveUncertainInterval: resolveInterval,
  };
}
