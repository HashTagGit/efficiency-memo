import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { SessionProvider } from "../../hooks/context";
import { Dashboard } from "../dashboard";
import type { Mock } from "vitest";

// ---------------------------------------------------------------------------
// Mock useTimer hook
// ---------------------------------------------------------------------------
const mockTimer = vi.hoisted(() => ({
  elapsed: 0,
  isRunning: false,
  isPaused: false,
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
}));

vi.mock("../../hooks/use-timer", () => ({
  useTimer: () => mockTimer,
}));

// ---------------------------------------------------------------------------
// Mock the db module used by SessionProvider
// ---------------------------------------------------------------------------
const { mockSelect, mockExecute } = vi.hoisted(() => ({
  mockSelect: vi.fn().mockResolvedValue([]),
  mockExecute: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../hooks/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: mockSelect,
    execute: mockExecute,
  }),
}));

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------
function Wrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock timer state to defaults
    mockTimer.elapsed = 0;
    mockTimer.isRunning = false;
    mockTimer.isPaused = false;
    mockTimer.start = vi.fn();
    mockTimer.stop = vi.fn();
    mockTimer.pause = vi.fn();
    mockTimer.resume = vi.fn();
  });

  describe("initial state", () => {
    it("renders timer display and controls", () => {
      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
      expect(screen.getByTestId("timer-display")).toBeInTheDocument();
      expect(screen.getByTestId("timer-value")).toHaveTextContent("00:00");
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    it("shows Start button when timer is not running", () => {
      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      expect(screen.getByTestId("start-button")).toBeInTheDocument();
      expect(screen.queryByTestId("pause-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("stop-button")).not.toBeInTheDocument();
    });

    it("does not show session info when no active session", () => {
      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      expect(screen.queryByTestId("session-info")).not.toBeInTheDocument();
    });
  });

  describe("timer controls", () => {
    it("calls start when Start is clicked", async () => {
      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      fireEvent.click(screen.getByTestId("start-button"));

      expect(mockTimer.start).toHaveBeenCalledOnce();
    });

    it("shows Pause and Stop buttons when timer is running", () => {
      mockTimer.isRunning = true;
      mockTimer.isPaused = false;

      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      expect(screen.getByTestId("pause-button")).toBeInTheDocument();
      expect(screen.getByTestId("stop-button")).toBeInTheDocument();
      expect(screen.queryByTestId("start-button")).not.toBeInTheDocument();
    });

    it("calls pause when Pause is clicked", () => {
      mockTimer.isRunning = true;
      mockTimer.isPaused = false;

      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      fireEvent.click(screen.getByTestId("pause-button"));

      expect(mockTimer.pause).toHaveBeenCalledOnce();
    });

    it("calls stop when Stop is clicked while running", () => {
      mockTimer.isRunning = true;
      mockTimer.isPaused = false;

      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      fireEvent.click(screen.getByTestId("stop-button"));

      expect(mockTimer.stop).toHaveBeenCalledOnce();
    });

    it("shows Resume and Stop buttons when paused", () => {
      mockTimer.isRunning = true;
      mockTimer.isPaused = true;

      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      expect(screen.getByTestId("resume-button")).toBeInTheDocument();
      expect(screen.getByTestId("stop-button")).toBeInTheDocument();
      expect(screen.queryByTestId("pause-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("start-button")).not.toBeInTheDocument();
    });

    it("calls resume when Resume is clicked", () => {
      mockTimer.isRunning = true;
      mockTimer.isPaused = true;

      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      fireEvent.click(screen.getByTestId("resume-button"));

      expect(mockTimer.resume).toHaveBeenCalledOnce();
    });

    it("calls stop when Stop is clicked while paused", () => {
      mockTimer.isRunning = true;
      mockTimer.isPaused = true;

      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      fireEvent.click(screen.getByTestId("stop-button"));

      expect(mockTimer.stop).toHaveBeenCalledOnce();
    });

    it("shows paused status text", () => {
      mockTimer.isRunning = true;
      mockTimer.isPaused = true;

      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      expect(screen.getByText("Paused")).toBeInTheDocument();
    });

    it("shows running status text", () => {
      mockTimer.isRunning = true;
      mockTimer.isPaused = false;

      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      expect(screen.getByText("Running")).toBeInTheDocument();
    });
  });

  describe("elapsed time display", () => {
    it("formats elapsed seconds as MM:SS", () => {
      mockTimer.elapsed = 65;

      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      expect(screen.getByTestId("timer-value")).toHaveTextContent("01:05");
    });

    it("displays zero-padded minutes and seconds", () => {
      mockTimer.elapsed = 3661; // 1h 1m 1s

      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      expect(screen.getByTestId("timer-value")).toHaveTextContent("61:01");
    });
  });

  describe("session integration", () => {
    it("starts session when Start is clicked", async () => {
      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      fireEvent.click(screen.getByTestId("start-button"));

      // SessionProvider creates a session via the mocked db
      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO sessions"),
          expect.arrayContaining(["user-1"]),
        );
      });
    });

    it("ends session when Stop is clicked after starting", async () => {
      const { rerender } = render(<Dashboard userId="user-1" />, {
        wrapper: Wrapper,
      });

      // Start a session
      fireEvent.click(screen.getByTestId("start-button"));

      await waitFor(() => {
        expect(screen.getByTestId("session-info")).toBeInTheDocument();
      });

      // Switch to running state so Stop button appears
      mockTimer.isRunning = true;
      mockTimer.isPaused = false;

      rerender(<Dashboard userId="user-1" />);

      // Stop
      fireEvent.click(screen.getByTestId("stop-button"));

      // endSession updates the DB
      await waitFor(() => {
        const updateCalls = mockExecute.mock.calls.filter(
          ([sql]: string[]) => sql.includes("UPDATE sessions"),
        );
        expect(updateCalls.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("shows session info when session is active", async () => {
      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      // Start a session
      fireEvent.click(screen.getByTestId("start-button"));

      await waitFor(() => {
        expect(screen.getByTestId("session-info")).toBeInTheDocument();
      });
    });

    it("uses default interval of 30 minutes", async () => {
      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      fireEvent.click(screen.getByTestId("start-button"));

      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO sessions"),
          expect.arrayContaining([30]),
        );
      });
    });

    it("accepts custom intervalMinutes prop", async () => {
      render(<Dashboard userId="user-1" intervalMinutes={45} />, {
        wrapper: Wrapper,
      });

      fireEvent.click(screen.getByTestId("start-button"));

      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO sessions"),
          expect.arrayContaining([45]),
        );
      });
    });

    it("shows session start time in the session info panel", async () => {
      render(<Dashboard userId="user-1" />, { wrapper: Wrapper });

      fireEvent.click(screen.getByTestId("start-button"));

      await waitFor(() => {
        expect(screen.getByTestId("session-info")).toBeInTheDocument();
      });

      expect(screen.getByTestId("session-start-time")).toBeInTheDocument();
    });
  });
});
