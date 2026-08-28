// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../../lib/i18n";
import { Dashboard } from "../components/dashboard";
import { CoreHourHome } from "../pages/dashboard-page";
import { loadCheckInInterval, loadDailyFocusGoal } from "../settings";
import { loadRecentActivities, loadTodaySessions } from "../today-data";
import type { TimerState } from "../hooks/use-timer";

vi.mock("../../../lib/auth", () => ({
  getCurrentUser: () => ({ id: "local-user" }),
}));

vi.mock("../settings", () => ({
  DEFAULT_DAILY_FOCUS_GOAL: 120,
  loadCheckInInterval: vi.fn(),
  loadDailyFocusGoal: vi.fn(),
}));

vi.mock("../today-data", () => ({
  elapsedSecondsForDay: vi.fn(() => 0),
  loadRecentActivities: vi.fn(),
  loadTodaySessions: vi.fn(),
  setActivityFavorite: vi.fn(),
}));

vi.mock("../hooks/use-session", () => ({
  useSession: () => ({
    activeSession: null,
    pendingCheckIn: null,
    startSession: vi.fn(),
    completeCheckIn: vi.fn(),
    endSession: vi.fn(),
  }),
}));

vi.mock("../hooks/use-tags", () => ({
  useTags: () => ({ activeTags: () => [] }),
}));

vi.mock("../notifications", () => ({
  requestCheckInNotifications: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const timer = {
  elapsed: 0,
  isPaused: false,
  isRunning: false,
  uncertainInterval: null,
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
  restore: vi.fn(),
  resolveUncertainInterval: vi.fn(),
} as unknown as TimerState;

describe("CoreHour Today states", () => {
  it("requires settings to load before opening the timer", async () => {
    vi.mocked(loadCheckInInterval)
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce(30);
    vi.mocked(loadDailyFocusGoal).mockResolvedValue(120);
    vi.mocked(loadRecentActivities).mockResolvedValue([]);
    vi.mocked(loadTodaySessions).mockResolvedValue([]);

    render(
      <I18nProvider initialLocale="en-US">
        <CoreHourHome timer={timer} />
      </I18nProvider>,
    );

    expect(await screen.findByText("CoreHour settings could not be loaded")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(loadCheckInInterval).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Today")).toBeTruthy();
  });

  it("keeps the timer available when today's summary fails", async () => {
    vi.mocked(loadRecentActivities)
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce([]);
    vi.mocked(loadTodaySessions).mockResolvedValue([]);

    render(
      <I18nProvider initialLocale="en-US">
        <Dashboard userId="local-user" intervalMinutes={30} dailyGoalMinutes={120} timer={timer} />
      </I18nProvider>,
    );

    expect(await screen.findByText("Today's activity could not be loaded")).toBeTruthy();
    expect((screen.getByTestId("start-button") as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(loadRecentActivities).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Completed activities will appear here for quick access.")).toBeTruthy();
  });
});
