// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../../lib/i18n";
import { loadDailyReview, saveDailyReview, type DailyReviewRecord, type DailyReviewState } from "../daily-review";
import { useSession } from "../hooks/use-session";
import { useCoreHourTimer } from "../runtime";
import DailyReviewPage from "../pages/daily-review-page";

vi.mock("../daily-review", async () => {
  const actual = await vi.importActual<typeof import("../daily-review")>("../daily-review");
  return { ...actual, loadDailyReview: vi.fn(), saveDailyReview: vi.fn() };
});

vi.mock("../hooks/use-session", () => ({ useSession: vi.fn() }));
vi.mock("../runtime", () => ({ useCoreHourTimer: vi.fn() }));

const state: DailyReviewState = {
  localDate: "2026-08-28",
  startedAt: "2026-08-28T00:00:00.000Z",
  endedAt: "2026-08-29T00:00:00.000Z",
  plannedMinutes: 90,
  actualMinutes: 75,
  planCount: 2,
  completedPlanCount: 1,
  skippedPlanCount: 1,
  pendingPlanCount: 0,
  pendingSuggestionCount: 0,
  breakCount: 2,
  hydrationCount: 3,
  currentGoalMinutes: 120,
  review: null,
};

beforeEach(() => {
  vi.mocked(useSession).mockReturnValue({ activeSession: null } as ReturnType<typeof useSession>);
  vi.mocked(useCoreHourTimer).mockReturnValue({ uncertainInterval: null } as ReturnType<typeof useCoreHourTimer>);
  vi.mocked(loadDailyReview).mockResolvedValue(state);
  vi.mocked(saveDailyReview).mockResolvedValue({
    id: "review-1",
    localDate: state.localDate,
    outcome: "on-track",
    nextGoalMinutes: 90,
    createdAt: "2026-08-28T18:00:00.000Z",
    updatedAt: "2026-08-28T18:00:00.000Z",
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Daily review", () => {
  it("saves one outcome and applies the next focus target", async () => {
    let resolveSave!: (value: DailyReviewRecord) => void;
    vi.mocked(saveDailyReview).mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    render(
      <MemoryRouter>
        <I18nProvider initialLocale="en-US">
          <DailyReviewPage userId="local-user" />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Day closeout" })).toBeTruthy();
    expect(screen.getByText("75 min")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "On track" }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete review" }));

    await waitFor(() => expect(saveDailyReview).toHaveBeenCalledWith({
      userId: "local-user",
      localDate: "2026-08-28",
      outcome: "on-track",
      nextGoalMinutes: 90,
      startedAt: state.startedAt,
      endedAt: state.endedAt,
      existingId: undefined,
    }));
    expect((screen.getByRole("spinbutton") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("radio", { name: "On track" }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Previous day" }) as HTMLButtonElement).disabled).toBe(true);
    resolveSave({
      id: "review-1",
      localDate: state.localDate,
      outcome: "on-track",
      nextGoalMinutes: 90,
      createdAt: "2026-08-28T18:00:00.000Z",
      updatedAt: "2026-08-28T18:00:00.000Z",
    });
    expect(await screen.findByText("Review saved. The next focus target is now active.")).toBeTruthy();
  });

  it("blocks completion until pending activity suggestions are reviewed", async () => {
    vi.mocked(loadDailyReview).mockResolvedValue({ ...state, pendingSuggestionCount: 2 });
    render(
      <MemoryRouter>
        <I18nProvider initialLocale="en-US">
          <DailyReviewPage userId="local-user" />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Pending activity suggestions: 2")).toBeTruthy();
    const complete = screen.getByRole("button", { name: "Complete review" }) as HTMLButtonElement;
    expect(complete.disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Review suggestions" })).toBeTruthy();
  });

  it("reopens a saved review from a recent prior day", async () => {
    const prior: DailyReviewState = {
      ...state,
      localDate: "2026-08-27",
      startedAt: "2026-08-27T00:00:00.000Z",
      endedAt: "2026-08-28T00:00:00.000Z",
      review: {
        id: "review-prior",
        localDate: "2026-08-27",
        outcome: "underplanned",
        nextGoalMinutes: 105,
        createdAt: "2026-08-27T18:00:00.000Z",
        updatedAt: "2026-08-27T18:00:00.000Z",
      },
    };
    vi.mocked(loadDailyReview).mockResolvedValueOnce(state).mockResolvedValueOnce(prior);
    render(
      <MemoryRouter>
        <I18nProvider initialLocale="en-US">
          <DailyReviewPage userId="local-user" />
        </I18nProvider>
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "Day closeout" });
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    await waitFor(() => expect(loadDailyReview).toHaveBeenCalledTimes(2));
    const firstDate = vi.mocked(loadDailyReview).mock.calls[0][1] as Date;
    const secondDate = vi.mocked(loadDailyReview).mock.calls[1][1] as Date;
    const expectedDate = new Date(firstDate);
    expectedDate.setDate(expectedDate.getDate() - 1);
    expect(secondDate.toDateString()).toBe(expectedDate.toDateString());
    expect(await screen.findByRole("button", { name: "Update review" })).toBeTruthy();
    expect((screen.getByRole("radio", { name: "Underplanned" }) as HTMLInputElement).checked).toBe(true);
  });
});
