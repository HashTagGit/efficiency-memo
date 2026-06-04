import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { SessionController } from "../session-controller";
import type { Session, Tag } from "../../types";
import type { SessionState } from "../../hooks/context";

// ---------------------------------------------------------------------------
// Test-only context for session state — makes mocking reactive
// ---------------------------------------------------------------------------
const TestSessionCtx = createContext<SessionState>(null!);

vi.mock("../../hooks/use-session", () => ({
  useSession: () => useContext(TestSessionCtx),
  SessionProvider: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

// ---------------------------------------------------------------------------
// Mutable tag array — controllable from tests
// ---------------------------------------------------------------------------
const { testTags } = vi.hoisted(() => ({ testTags: [] as Tag[] }));

vi.mock("../../hooks/context", () => ({
  useTagsContext: () => ({
    tags: testTags,
    loadTags: vi.fn(),
    addTag: vi.fn(),
    renameTag: vi.fn(),
    archiveTag: vi.fn(),
    activeTags: vi.fn().mockReturnValue(testTags),
  }),
}));

// ---------------------------------------------------------------------------
// Wrapper: provides reactive session state + tags
// ---------------------------------------------------------------------------
function Wrapper({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  const sessionValue = useMemo<SessionState>(
    () => ({
      activeSession,
      sessions: activeSession ? [activeSession] : [],
      loadSessions: vi.fn(),
      startSession: async (userId: string, intervalMinutes: number) => {
        const s: Session = {
          id: crypto.randomUUID(),
          user_id: userId,
          started_at: new Date().toISOString(),
          ended_at: null,
          interval_minutes: intervalMinutes,
          synced: false,
        };
        setActiveSession(s);
      },
      endSession: async () => {
        setActiveSession(null);
      },
    }),
    [activeSession],
  );

  return (
    <TestSessionCtx.Provider value={sessionValue}>
      {children}
    </TestSessionCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderController(userId = "user-1", intervalMinutes = 30) {
  return render(
    <SessionController userId={userId} intervalMinutes={intervalMinutes}>
      {(state) => (
        <div>
          {state.isRunning ? (
            <>
              <span data-testid="elapsed">{state.elapsed}</span>
              <span data-testid="check-in-count">{state.checkInCount}</span>
              <span data-testid="running-indicator">Running</span>
              {state.isPaused && (
                <span data-testid="paused-indicator">Paused</span>
              )}
              <button
                onClick={state.end}
                data-testid="end-session-btn"
                type="button"
              >
                End Session
              </button>
            </>
          ) : (
            <button
              onClick={state.start}
              data-testid="start-session-btn"
              type="button"
            >
              Start Session
            </button>
          )}
        </div>
      )}
    </SessionController>,
    { wrapper: Wrapper },
  );
}

const TAG_A: Tag = {
  id: "tag-a",
  user_id: "user-1",
  name: "Deep Work",
  color: "#22c55e",
  is_archived: false,
  created_at: "2026-06-01T10:00:00.000Z",
  synced: false,
};

const TAG_B: Tag = {
  id: "tag-b",
  user_id: "user-1",
  name: "Meetings",
  color: "#3b82f6",
  is_archived: false,
  created_at: "2026-06-01T10:00:00.000Z",
  synced: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SessionController", () => {
  beforeEach(() => {
    // Use fake timers for setInterval/Date but keep setTimeout real
    // so testing-library's waitFor can poll correctly
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    vi.clearAllMocks();
    testTags.length = 0;
    testTags.push(TAG_A, TAG_B); // default: tags available
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Initial state ──
  it("renders start button when idle", () => {
    renderController();
    expect(screen.getByTestId("start-session-btn")).toBeInTheDocument();
    expect(screen.queryByTestId("running-indicator")).not.toBeInTheDocument();
  });

  // ── Start session ──
  it("starts session and timer when start is clicked", async () => {
    renderController();

    fireEvent.click(screen.getByTestId("start-session-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("running-indicator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("elapsed").textContent).toBe("0");

    // Timer advances
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("elapsed").textContent).toBe("5");
  });

  // ── Check-in triggers at interval ──
  it("shows check-in modal after interval minutes of elapsed time", async () => {
    renderController("user-1", 1); // 1-minute interval for fast test

    fireEvent.click(screen.getByTestId("start-session-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("running-indicator")).toBeInTheDocument();
    });

    // Advance time past the 1-minute (60s) check-in interval
    act(() => {
      vi.advanceTimersByTime(61_000);
    });

    // Check-in modal should appear
    await waitFor(() => {
      expect(screen.getByTestId("check-in-modal")).toBeInTheDocument();
    });
  });

  // ── Check-in skip ──
  it("closes check-in modal on skip and continues session", async () => {
    renderController("user-1", 1);

    fireEvent.click(screen.getByTestId("start-session-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("running-indicator")).toBeInTheDocument();
    });

    // Advance past interval to trigger check-in
    act(() => {
      vi.advanceTimersByTime(61_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("check-in-modal")).toBeInTheDocument();
    });

    // Click skip
    fireEvent.click(screen.getByTestId("check-in-skip"));

    await waitFor(() => {
      expect(screen.queryByTestId("check-in-modal")).not.toBeInTheDocument();
    });

    // Session should still be running
    expect(screen.getByTestId("running-indicator")).toBeInTheDocument();
  });

  // ── Check-in submit ──
  it("submits check-in with tag allocations and increments counter", async () => {
    renderController("user-1", 1);

    fireEvent.click(screen.getByTestId("start-session-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("running-indicator")).toBeInTheDocument();
    });

    // Advance to trigger check-in
    act(() => {
      vi.advanceTimersByTime(61_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("check-in-modal")).toBeInTheDocument();
    });

    // Select tags
    fireEvent.click(screen.getByTestId(`tag-checkbox-${TAG_A.id}`));
    fireEvent.click(screen.getByTestId(`tag-checkbox-${TAG_B.id}`));

    // Set percentages
    fireEvent.change(screen.getByTestId(`tag-percentage-${TAG_A.id}`), {
      target: { value: "60" },
    });
    fireEvent.change(screen.getByTestId(`tag-percentage-${TAG_B.id}`), {
      target: { value: "40" },
    });

    // Submit
    fireEvent.click(screen.getByTestId("check-in-submit"));

    await waitFor(() => {
      expect(screen.queryByTestId("check-in-modal")).not.toBeInTheDocument();
    });

    // Check-in count should be 1
    expect(screen.getByTestId("check-in-count").textContent).toBe("1");
    expect(screen.getByTestId("running-indicator")).toBeInTheDocument();
  });

  // ── End session ──
  it("ends session when end is clicked — stops timer and shows start button", async () => {
    renderController();

    fireEvent.click(screen.getByTestId("start-session-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("running-indicator")).toBeInTheDocument();
    });

    // Let timer run a bit
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByTestId("elapsed").textContent).toBe("10");

    // End the session
    fireEvent.click(screen.getByTestId("end-session-btn"));

    await waitFor(() => {
      expect(screen.queryByTestId("running-indicator")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("start-session-btn")).toBeInTheDocument();
  });

  // ── Multiple check-ins ──
  it("triggers multiple check-ins across longer sessions", async () => {
    renderController("user-1", 1);

    fireEvent.click(screen.getByTestId("start-session-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("running-indicator")).toBeInTheDocument();
    });

    // First check-in after 1 minute
    act(() => {
      vi.advanceTimersByTime(61_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("check-in-modal")).toBeInTheDocument();
    });

    // Skip first check-in
    fireEvent.click(screen.getByTestId("check-in-skip"));

    await waitFor(() => {
      expect(screen.queryByTestId("check-in-modal")).not.toBeInTheDocument();
    });

    // Advance past second interval
    act(() => {
      vi.advanceTimersByTime(61_000);
    });

    // Wait for second check-in to appear
    await waitFor(() => {
      expect(screen.getByTestId("check-in-modal")).toBeInTheDocument();
    });

    // Skip second check-in
    fireEvent.click(screen.getByTestId("check-in-skip"));

    await waitFor(() => {
      expect(screen.queryByTestId("check-in-modal")).not.toBeInTheDocument();
    });
  });

  // ── Check-in does not trigger before interval ──
  it("does not trigger check-in before interval has elapsed", async () => {
    renderController("user-1", 1);

    fireEvent.click(screen.getByTestId("start-session-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("running-indicator")).toBeInTheDocument();
    });

    // Advance a bit but not past interval
    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    // No modal before interval
    expect(screen.queryByTestId("check-in-modal")).not.toBeInTheDocument();
  });

  // ── Check-in count resets on new session ──
  it("resets check-in count when starting a new session after ending one", async () => {
    renderController("user-1", 1);

    // First session
    fireEvent.click(screen.getByTestId("start-session-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("running-indicator")).toBeInTheDocument();
    });

    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    await waitFor(() => {
      expect(screen.getByTestId("check-in-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("check-in-skip"));
    await waitFor(() => {
      expect(screen.queryByTestId("check-in-modal")).not.toBeInTheDocument();
    });

    // End first session
    fireEvent.click(screen.getByTestId("end-session-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("start-session-btn")).toBeInTheDocument();
    });

    // Start second session — check-in count should be 0
    fireEvent.click(screen.getByTestId("start-session-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("running-indicator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("check-in-count").textContent).toBe("0");
  });
});
