// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../../lib/i18n";
import { loadDashboardNow } from "../dashboard-data";
import { DashboardPage } from "../page";

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
  useCoreHourLoadState: () => ({ loading: false, loadError: false }),
  useCoreHourTimer: () => ({ elapsed: 3723 }),
}));

vi.mock("../../../features/pause-hydrate/context", () => ({
  usePauseHydrate: () => ({
    loading: false,
    loadError: false,
    state: {
      reminders: {
        break: { enabled: true, nextDueAt: "2030-01-01T10:00:00.000Z", pendingAt: null },
        hydration: { enabled: true, nextDueAt: "2030-01-01T09:00:00.000Z", pendingAt: "2030-01-01T08:59:00.000Z" },
      },
    },
  }),
}));

vi.mock("../dashboard-data", () => ({
  loadDashboardNow: vi.fn(),
}));

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
      deviceCount: 2,
      deviceAttentionCount: 1,
    });

    render(
      <MemoryRouter>
        <I18nProvider initialLocale="en-US">
          <DashboardPage />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Now" })).toBeTruthy();
    expect(screen.getByText("Write brief")).toBeTruthy();
    expect(await screen.findByText("Review roadmap")).toBeTruthy();
    expect(screen.getByText("Drink water needs your attention.")).toBeTruthy();
    expect(screen.getByText("Devices needing attention: 1")).toBeTruthy();
    expect(screen.getByTestId("dashboard-tool-launcher")).toBeTruthy();
  });
});
