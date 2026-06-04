import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useHistory } from "../use-history";

// ---------------------------------------------------------------------------
// Mock the db module
// ---------------------------------------------------------------------------
const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn().mockResolvedValue([]),
}));

vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: mockSelect,
    execute: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("useHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty sessions and not loading", () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.sessions).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("loadHistory populates completed sessions", async () => {
    const sessionRows = [
      {
        id: "s1",
        user_id: "user-1",
        started_at: "2026-06-01T10:00:00.000Z",
        ended_at: "2026-06-01T12:00:00.000Z",
        interval_minutes: 30,
        synced: 1,
      },
    ];
    mockSelect.mockResolvedValueOnce(sessionRows);

    const { result } = renderHook(() => useHistory());

    await act(async () => {
      await result.current.loadHistory("user-1");
    });

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
    });
    expect(result.current.sessions[0].id).toBe("s1");
    expect(result.current.sessions[0].ended_at).toBe("2026-06-01T12:00:00.000Z");
    expect(result.current.sessions[0].synced).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it("loadHistory only loads sessions with ended_at IS NOT NULL", async () => {
    mockSelect.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useHistory());

    await act(async () => {
      await result.current.loadHistory("user-1");
    });

    const sql = mockSelect.mock.calls[0][0] as string;
    expect(sql).toContain("ended_at IS NOT NULL");
  });

  it("sets loading state during loadHistory", async () => {
    let resolvePromise!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockSelect.mockReturnValueOnce(pendingPromise);

    const { result } = renderHook(() => useHistory());

    // Start the load but don't await it yet
    let loadPromise: Promise<void>;
    act(() => {
      loadPromise = result.current.loadHistory("user-1");
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise([]);
      await loadPromise!;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("filterByDate returns sessions within date range", async () => {
    const sessionRows = [
      {
        id: "s1",
        user_id: "user-1",
        started_at: "2026-06-01T10:00:00.000Z",
        ended_at: "2026-06-01T12:00:00.000Z",
        interval_minutes: 30,
        synced: 1,
      },
      {
        id: "s2",
        user_id: "user-1",
        started_at: "2026-06-02T10:00:00.000Z",
        ended_at: "2026-06-02T12:00:00.000Z",
        interval_minutes: 30,
        synced: 1,
      },
    ];
    mockSelect.mockResolvedValueOnce(sessionRows);

    const { result } = renderHook(() => useHistory());

    await act(async () => {
      await result.current.loadHistory("user-1");
    });

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2);
    });

    const filtered = result.current.filterByDate(
      "2026-06-01T00:00:00.000Z",
      "2026-06-01T23:59:59.999Z",
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("s1");
  });

  it("filterByDate returns empty when no sessions match", async () => {
    mockSelect.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useHistory());

    await act(async () => {
      await result.current.loadHistory("user-1");
    });

    const filtered = result.current.filterByDate(
      "2025-01-01T00:00:00.000Z",
      "2025-12-31T23:59:59.999Z",
    );

    expect(filtered).toEqual([]);
  });
});
