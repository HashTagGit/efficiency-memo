import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { SessionProvider, useSessionContext } from "../context";

// ---------------------------------------------------------------------------
// Mock the db module – vi.hoisted() runs before vi.mock hoisting
// ---------------------------------------------------------------------------
const { mockSelect, mockExecute } = vi.hoisted(() => ({
  mockSelect: vi.fn().mockResolvedValue([]),
  mockExecute: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: mockSelect,
    execute: mockExecute,
  }),
}));

// ---------------------------------------------------------------------------
// Wrapper component that provides SessionContext
// ---------------------------------------------------------------------------
function Wrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

describe("useSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with no active session", () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper: Wrapper });
    expect(result.current.activeSession).toBeNull();
    expect(result.current.sessions).toEqual([]);
  });

  it("startSession creates an active session", async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startSession("user-1", 30);
    });

    await waitFor(() => {
      expect(result.current.activeSession).not.toBeNull();
    });
    expect(result.current.activeSession?.user_id).toBe("user-1");
    expect(result.current.activeSession?.interval_minutes).toBe(30);
    expect(result.current.activeSession?.ended_at).toBeNull();
    expect(result.current.sessions).toHaveLength(1);
    expect(mockExecute).toHaveBeenCalledOnce();
  });

  it("endSession clears the active session", async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startSession("user-1", 30);
    });
    await act(async () => {
      await result.current.endSession();
    });

    await waitFor(() => {
      expect(result.current.activeSession).toBeNull();
    });
  });

  it("endSession sets ended_at on the session in the list", async () => {
    const { result } = renderHook(() => useSessionContext(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startSession("user-1", 30);
    });
    await act(async () => {
      await result.current.endSession();
    });

    await waitFor(() => {
      expect(result.current.sessions[0]?.ended_at).not.toBeNull();
    });
    expect(result.current.sessions[0]?.synced).toBe(false);
  });

  it("loadSessions restores active session", async () => {
    const activeSession = {
      id: "s1",
      user_id: "user-1",
      started_at: "2026-06-01T12:00:00.000Z",
      ended_at: null,
      interval_minutes: 30,
      synced: true,
    };
    mockSelect.mockResolvedValueOnce([activeSession]);

    const { result } = renderHook(() => useSessionContext(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.loadSessions("user-1");
    });

    await waitFor(() => {
      expect(result.current.activeSession).not.toBeNull();
    });
    expect(result.current.activeSession?.id).toBe("s1");
    expect(result.current.sessions).toHaveLength(1);
  });

  it("loadSessions sets activeSession to null when no active session", async () => {
    const completedSession = {
      id: "s2",
      user_id: "user-1",
      started_at: "2026-06-01T11:00:00.000Z",
      ended_at: "2026-06-01T11:30:00.000Z",
      interval_minutes: 30,
      synced: true,
    };
    mockSelect.mockResolvedValueOnce([completedSession]);

    const { result } = renderHook(() => useSessionContext(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.loadSessions("user-1");
    });

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
    });
    expect(result.current.activeSession).toBeNull();
  });
});
