"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTimer } from "../hooks/use-timer";
import { useSession } from "../hooks/use-session";
import { useTagsContext } from "../hooks/context";
import { CheckInModal, type CheckInData } from "./check-in-modal";
import type { Tag } from "../types";

export interface SessionControllerState {
  elapsed: number;
  isRunning: boolean;
  isPaused: boolean;
  checkInCount: number;
  start: () => void;
  end: () => void;
}

export interface SessionControllerProps {
  userId: string;
  intervalMinutes?: number;
  children: (state: SessionControllerState) => React.ReactNode;
}

export function SessionController({
  userId,
  intervalMinutes = 30,
  children,
}: SessionControllerProps) {
  const timer = useTimer();
  const { activeSession, startSession, endSession } = useSession();
  const { tags } = useTagsContext();

  const [checkInCount, setCheckInCount] = useState(0);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  // Refs to avoid stale closures inside effects and callbacks
  const intervalRef = useRef(intervalMinutes);
  const lastCheckInRef = useRef(0);
  const checkInCountRef = useRef(0);
  const isCheckInOpenRef = useRef(false);

  // Keep refs in sync with latest values
  intervalRef.current = intervalMinutes;
  isCheckInOpenRef.current = isCheckInOpen;

  // ── Start a new session ──
  const start = useCallback(async () => {
    lastCheckInRef.current = 0;
    checkInCountRef.current = 0;
    setCheckInCount(0);
    setIsCheckInOpen(false);

    await startSession(userId, intervalMinutes);
    timer.start();
  }, [userId, intervalMinutes, startSession, timer]);

  // ── End current session ──
  const end = useCallback(async () => {
    timer.stop();
    await endSession();
    setIsCheckInOpen(false);
    setCheckInCount(0);
  }, [timer, endSession]);

  // ── Check-in trigger: monitor elapsed time ──
  useEffect(() => {
    if (!timer.isRunning || timer.isPaused) return;
    // Don't stack check-ins — if one is already open, wait
    if (isCheckInOpenRef.current) return;

    const intervalSeconds = intervalRef.current * 60;
    const elapsedSinceLastCheck = timer.elapsed - lastCheckInRef.current;

    if (elapsedSinceLastCheck >= intervalSeconds && intervalSeconds > 0) {
      lastCheckInRef.current = timer.elapsed;
      setIsCheckInOpen(true);
    }
  }, [timer.elapsed, timer.isRunning, timer.isPaused]);

  // ── Check-in handlers ──
  const handleCheckIn = useCallback(async (_data: CheckInData) => {
    setIsCheckInOpen(false);
    checkInCountRef.current += 1;
    setCheckInCount(checkInCountRef.current);
  }, []);

  const handleSkip = useCallback(async () => {
    setIsCheckInOpen(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsCheckInOpen(false);
  }, []);

  // ── Active (non-archived) tags for the check-in modal ──
  const activeTags: Tag[] = tags.filter((t) => !t.is_archived);

  const state: SessionControllerState = {
    elapsed: timer.elapsed,
    isRunning: timer.isRunning,
    isPaused: timer.isPaused,
    checkInCount,
    start,
    end,
  };

  return (
    <>
      {children(state)}
      {activeSession && (
        <CheckInModal
          isOpen={isCheckInOpen}
          onClose={handleClose}
          session={activeSession}
          tags={activeTags}
          onCheckIn={handleCheckIn}
          onSkip={handleSkip}
        />
      )}
    </>
  );
}
