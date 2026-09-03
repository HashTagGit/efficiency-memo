// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../../lib/i18n";
import { loadDashboardNow } from "../dashboard-data";
import { DashboardPage } from "../page";

const hookState = vi.hoisted(() => ({
  coreLoading: false,
  coreLoadError: false,
  uncertain: true,
  pauseLoading: false,
  pauseLoadError: false,
  breakPending: true,
  hydrationPending: true,
  coreHourActive: true,
}));

vi.mock("../../../lib/auth", () => ({
  getCurrentUser: () => ({ id: "local-user" }),
}));

vi.mock("../../../lib/tool-registry/registry", () => ({
  getRegisteredTools: () => [{
    id: "core-hour",
    name: "CoreHour",
    icon: "clock",
    description: "",
    routes: ["/tools/core-hour"],
    enabled: true,
  }],
}));

vi.mock("../../../features/core-hour/hooks/use-session", () => ({
  useSession: () => ({
    activeSession: { activity: "Write brief" },
  }),
}));

vi.mock("../../../features/core-hour/runtime", () => ({
  useCoreHourLoadState: () => ({ loading: hookState.coreLoading, loadError: hookState.coreLoadError }),
  useCoreHourTimer: () => ({
    elapsed: 3723,
    uncertainInterval: hookState.uncertain ? {
      reason: "scheduler-gap",
      durationSeconds: 180,
      countedSeconds: 0,
      detectedAt: "2030-01-01T08:58:00.000Z",
    } : null,
  }),
}));

vi.mock("../../../features/pause-hydrate/context", () => ({
  usePauseHydrate: () => ({
    loading: hookState.pauseLoading,
    loadError: hookState.pauseLoadError,
    state: {
      reminders: {
        break: { kind: "break", enabled: true, intervalMinutes: 60, nextDueAt: "2000-01-03T10:00:00.000Z", pendingAt: hookState.breakPending ? "2030-01-01T08:58:00.000Z" : null, mutedUntil: null },
        hydration: { kind: "hydration", enabled: true, intervalMinutes: 45, nextDueAt: "2000-01-03T09:00:00.000Z", pendingAt: hookState.hydrationPending ? "2030-01-01T08:59:00.000Z" : null, mutedUntil: null },
      },
      coreHourActive: hookState.coreHourActive,
      systemDeferred: false,
      systemDeferralUntil: null,
      schedulePolicy: {
        activeWeekdays: [0, 1, 2, 3, 4, 5, 6],
        weekdaySchedules: Array.from({ length: 7 }, () => ({
          workWindows: [{ startMinute: 0, endMinute: 1439 }],
          quietWindows: [],
        })),
        calendarEnabled: false,
        calendarYear: 0,
        calendarAvailable: false,
        calendarData: null,
        naturalBreakEnabled: false,
        naturalBreakMinutes: 5,
        systemDeferralEnabled: true,
        deferralGraceMinutes: 5,
      },
    },
  }),
}));

vi.mock("../dashboard-data", () => ({
  loadDashboardNow: vi.fn(),
}));

beforeEach(() => {
  Object.assign(hookState, {
    coreLoading: false,
    coreLoadError: false,
    uncertain: true,
    pauseLoading: false,
    pauseLoadError: false,
    breakPending: true,
    hydrationPending: true,
    coreHourActive: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Now dashboard", () => {
  it("prioritizes active, due, and next work before the tool launcher", async () => {
    const start = new Date(Date.now() + 60 * 60_000);
    const end = new Date(start.getTime() + 30 * 60_000);
    vi.mocked(loadDashboardNow).mockResolvedValue({
      nextPlan: {
        id: "plan-1",
        title: "Review roadmap",
        started_at: start.toISOString(),
        ended_at: end.toISOString(),
      },
      pendingSuggestionCount: 1,
      dueReviewKind: "weekly",
    });

    render(
      <MemoryRouter>
        <I18nProvider initialLocale="en-US">
          <DashboardPage />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Now" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Day closeout" })).toBeTruthy();
    expect(screen.getByText("Write brief")).toBeTruthy();
    expect(await screen.findByText("Review roadmap")).toBeTruthy();
    expect(screen.getByText("Movement break needs your attention.")).toBeTruthy();
    expect(screen.getByText("Pending review: 1")).toBeTruthy();
    expect(screen.getByText("Rest and drink water are due")).toBeTruthy();
    expect(screen.getAllByTestId("dashboard-attention-item")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Review time" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open weekly review" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review suggestions" })).toBeTruthy();
    expect(screen.getByTestId("dashboard-tool-launcher")).toBeTruthy();
  });

  it("marks a partial feed while other attention sources are loading", () => {
    hookState.coreLoading = true;
    hookState.pauseLoading = true;
    hookState.breakPending = false;
    hookState.hydrationPending = false;
    vi.mocked(loadDashboardNow).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <I18nProvider initialLocale="en-US">
          <DashboardPage />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Checking each tool for items that need attention.")).toBeTruthy();
    expect(screen.getAllByTestId("dashboard-attention-item")).toHaveLength(1);
    expect(screen.queryByText("Nothing needs attention right now.")).toBeNull();
  });

  it("marks a partial feed when another attention source is unavailable", async () => {
    hookState.coreLoadError = true;
    hookState.breakPending = false;
    hookState.hydrationPending = false;
    vi.mocked(loadDashboardNow).mockResolvedValue({
      nextPlan: null,
      pendingSuggestionCount: 0,
      dueReviewKind: null,
    });

    render(
      <MemoryRouter>
        <I18nProvider initialLocale="en-US">
          <DashboardPage />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Some attention sources could not be confirmed. Retry before treating the list as clear.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry sources" })).toBeTruthy();
    expect(screen.getAllByTestId("dashboard-attention-item")).toHaveLength(1);
  });

  it("shows that an overdue reminder is waiting for the active focus session", async () => {
    hookState.uncertain = false;
    hookState.breakPending = false;
    hookState.hydrationPending = false;
    vi.mocked(loadDashboardNow).mockResolvedValue({
      nextPlan: null,
      pendingSuggestionCount: 0,
      dueReviewKind: null,
    });

    render(
      <MemoryRouter>
        <I18nProvider initialLocale="en-US">
          <DashboardPage />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Waiting until CoreHour focus ends")).toBeTruthy();
  });
});
