// @vitest-environment jsdom

import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dbExecute, dbSelect } from "../../../lib/db";
import { SessionProvider } from "../hooks/context";
import { useSession } from "../hooks/use-session";
import { writeSessionProgress } from "../session-progress";

vi.mock("../../../lib/db", () => ({
  dbExecute: vi.fn().mockResolvedValue(undefined),
  dbSelect: vi.fn().mockResolvedValue([]),
}));

describe("SessionProvider progress restoration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("restores an unresolved interval for the active session", async () => {
    writeSessionProgress({
      sessionId: "session-1",
      elapsedSeconds: 600,
      recordedSeconds: 300,
      uncertainInterval: {
        reason: "system-idle",
        durationSeconds: 300,
        countedSeconds: 300,
        detectedAt: "2026-08-28T10:00:00.000Z",
      },
    });
    vi.mocked(dbSelect)
      .mockResolvedValueOnce([{
        id: "session-1",
        user_id: "local-user",
        started_at: "2026-08-28T09:00:00.000Z",
        ended_at: null,
        interval_minutes: 30,
        elapsed_seconds: 0,
        activity: "Focus",
        default_tag_id: null,
        is_favorite: 0,
        synced: 0,
      }])
      .mockResolvedValueOnce([]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    );
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => { await result.current.loadSessions("local-user"); });

    expect(result.current.activeSession?.elapsed_seconds).toBe(600);
    expect(result.current.restoredUncertainInterval).toMatchObject({
      reason: "system-idle",
      durationSeconds: 300,
    });
  });

  it("ends with resolved elapsed time and creates one remainder check-in", async () => {
    writeSessionProgress({
      sessionId: "session-1",
      elapsedSeconds: 300,
      recordedSeconds: 0,
      uncertainInterval: null,
    });
    vi.mocked(dbSelect)
      .mockResolvedValueOnce([{
        id: "session-1",
        user_id: "local-user",
        started_at: "2026-08-28T09:00:00.000Z",
        ended_at: null,
        interval_minutes: 30,
        elapsed_seconds: 0,
        activity: "Focus",
        default_tag_id: null,
        is_favorite: 0,
        synced: 0,
      }])
      .mockResolvedValueOnce([]);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    );
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(async () => { await result.current.loadSessions("local-user"); });
    await act(async () => { await result.current.endSession(999, 0); });

    const calls = vi.mocked(dbExecute).mock.calls;
    expect(calls[0]?.[1]?.[1]).toBe(300);
    expect(calls.filter(([sql]) => sql.startsWith("INSERT INTO ch_check_ins"))).toHaveLength(1);
    expect(calls.find(([sql]) => sql.startsWith("INSERT INTO ch_check_ins"))?.[1]?.[4]).toBe(300);
  });
});
