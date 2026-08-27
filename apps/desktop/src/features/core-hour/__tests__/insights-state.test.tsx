// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../../lib/i18n";
import { loadDailyFocusGoal } from "../settings";
import InsightsPage from "../pages/insights-page";

vi.mock("../../../lib/db", () => ({
  dbSelect: vi.fn().mockResolvedValue([]),
}));

vi.mock("../settings", () => ({
  DEFAULT_DAILY_FOCUS_GOAL: 120,
  loadDailyFocusGoal: vi.fn(),
}));

vi.mock("../planned-blocks", () => ({
  loadPlansForRange: vi.fn().mockResolvedValue([]),
}));

vi.mock("../today-data", () => ({
  loadSessionsForDays: vi.fn().mockResolvedValue([]),
  totalSessionSeconds: vi.fn(() => 0),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CoreHour Insights states", () => {
  it("recovers from an initial load failure without showing a zero dashboard", async () => {
    vi.mocked(loadDailyFocusGoal)
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce(120);

    render(
      <MemoryRouter>
        <I18nProvider initialLocale="en-US">
          <InsightsPage userId="local-user" />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Insights could not be loaded")).toBeTruthy();
    expect(screen.queryByText("This week")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(loadDailyFocusGoal).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("No focus data yet")).toBeTruthy();
  });
});
