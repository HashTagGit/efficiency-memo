// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../../lib/i18n";
import { loadWeeklyReview, saveWeeklyReview, type WeeklyReviewRecord, type WeeklyReviewState } from "../weekly-review";
import { useSession } from "../hooks/use-session";
import { useCoreHourTimer } from "../runtime";
import WeeklyReviewPage from "../pages/weekly-review-page";

vi.mock("../weekly-review", () => ({ loadWeeklyReview: vi.fn(), saveWeeklyReview: vi.fn() }));
vi.mock("../hooks/use-session", () => ({ useSession: vi.fn() }));
vi.mock("../runtime", () => ({ useCoreHourTimer: vi.fn() }));

const state: WeeklyReviewState = {
  weekStartedOn: "2026-08-24",
  startedAt: "2026-08-24T00:00:00.000Z",
  endedAt: "2026-08-31T00:00:00.000Z",
  plannedMinutes: 300,
  actualMinutes: 240,
  planCount: 5,
  completedPlanCount: 3,
  skippedPlanCount: 1,
  pendingPlanCount: 1,
  sessionCount: 6,
  longestFocusMinutes: 90,
  pendingSuggestionCount: 0,
  breakCount: 4,
  hydrationCount: 6,
  dailyReviewCount: 3,
  currentGoalMinutes: 120,
  review: null,
};

beforeEach(() => {
  vi.mocked(useSession).mockReturnValue({ activeSession: null } as ReturnType<typeof useSession>);
  vi.mocked(useCoreHourTimer).mockReturnValue({ uncertainInterval: null } as ReturnType<typeof useCoreHourTimer>);
  vi.mocked(loadWeeklyReview).mockResolvedValue(state);
  vi.mocked(saveWeeklyReview).mockResolvedValue({
    id: "weekly-1",
    weekStartedOn: state.weekStartedOn,
    outcome: "overcommitted",
    nextGoalMinutes: 90,
    createdAt: "2026-08-30T18:00:00.000Z",
    updatedAt: "2026-08-30T18:00:00.000Z",
  });
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Weekly review", () => {
  it("summarizes capacity and saves the next focus target", async () => {
    let resolveSave!: (value: WeeklyReviewRecord) => void;
    vi.mocked(saveWeeklyReview).mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    render(<MemoryRouter initialEntries={["/tools/core-hour/review/week"]}><I18nProvider initialLocale="en-US"><WeeklyReviewPage userId="local-user" /></I18nProvider></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Weekly review" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Day closeout" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Weekly review" })).toBeTruthy();
    expect(screen.getByText("Daily reviews completed: 3/7")).toBeTruthy();
    expect(screen.getByText("90 min")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Overcommitted" }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete weekly review" }));
    await waitFor(() => expect(saveWeeklyReview).toHaveBeenCalledWith({
      userId: "local-user",
      weekStartedOn: state.weekStartedOn,
      outcome: "overcommitted",
      nextGoalMinutes: 90,
      startedAt: state.startedAt,
      endedAt: state.endedAt,
      existingId: undefined,
    }));
    expect((screen.getByRole("spinbutton") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Previous week" }) as HTMLButtonElement).disabled).toBe(true);
    resolveSave({
      id: "weekly-1",
      weekStartedOn: state.weekStartedOn,
      outcome: "overcommitted",
      nextGoalMinutes: 90,
      createdAt: "2026-08-30T18:00:00.000Z",
      updatedAt: "2026-08-30T18:00:00.000Z",
    });
    expect(await screen.findByText("Weekly review saved. The next focus target is now active.")).toBeTruthy();
  });

  it("blocks completion while the week has pending suggestions", async () => {
    vi.mocked(loadWeeklyReview).mockResolvedValue({ ...state, pendingSuggestionCount: 2 });
    render(<MemoryRouter initialEntries={["/tools/core-hour/review/week"]}><I18nProvider initialLocale="en-US"><WeeklyReviewPage userId="local-user" /></I18nProvider></MemoryRouter>);
    expect(await screen.findByText("Pending activity suggestions in this week: 2")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Complete weekly review" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("reopens a saved recent prior week", async () => {
    const prior: WeeklyReviewState = {
      ...state,
      weekStartedOn: "2026-08-17",
      startedAt: "2026-08-17T00:00:00.000Z",
      endedAt: "2026-08-24T00:00:00.000Z",
      review: {
        id: "weekly-prior",
        weekStartedOn: "2026-08-17",
        outcome: "underplanned",
        nextGoalMinutes: 105,
        createdAt: "2026-08-23T18:00:00.000Z",
        updatedAt: "2026-08-23T18:00:00.000Z",
      },
    };
    vi.mocked(loadWeeklyReview).mockResolvedValueOnce(state).mockResolvedValueOnce(prior);
    render(<MemoryRouter initialEntries={["/tools/core-hour/review/week"]}><I18nProvider initialLocale="en-US"><WeeklyReviewPage userId="local-user" /></I18nProvider></MemoryRouter>);
    await screen.findByRole("heading", { name: "Weekly review" });
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    await waitFor(() => expect(loadWeeklyReview).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: "Update weekly review" })).toBeTruthy();
    expect((screen.getByRole("radio", { name: "Underplanned" }) as HTMLInputElement).checked).toBe(true);
  });
});
