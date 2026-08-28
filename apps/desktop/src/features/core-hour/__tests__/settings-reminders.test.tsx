// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../../lib/i18n";
import SettingsPage from "../pages/settings-page";
import { saveReviewReminderPreferences } from "../review-reminder";
import { requestCoreHourNotifications } from "../notifications";
import { saveDailyFocusGoal } from "../settings";

vi.mock("../../../lib/auth", () => ({ getCurrentUser: () => ({ id: "local-user" }) }));
vi.mock("../settings", () => ({
  DEFAULT_DAILY_FOCUS_GOAL: 120,
  checkInIntervalOptions: [15, 30, 60],
  loadCheckInInterval: vi.fn().mockResolvedValue(30),
  loadDailyFocusGoal: vi.fn().mockResolvedValue(120),
  normalizeDailyFocusGoal: (value: number) => value,
  saveCheckInInterval: vi.fn().mockResolvedValue(undefined),
  saveDailyFocusGoal: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../review-reminder", () => ({
  loadReviewReminderPreferences: vi.fn().mockResolvedValue({
    dailyEnabled: false,
    dailyMinute: 1080,
    weeklyEnabled: false,
    weeklyWeekday: 6,
    weeklyMinute: 1080,
    lastDailyLocalDate: null,
    lastWeeklyStartedOn: null,
    pendingDailyLocalDate: null,
    pendingWeekStartedOn: null,
  }),
  saveReviewReminderPreferences: vi.fn(),
}));
vi.mock("../notifications", () => ({ requestCoreHourNotifications: vi.fn() }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Review reminder settings", () => {
  it("persists opt-in schedules before requesting notification permission", async () => {
    vi.mocked(saveReviewReminderPreferences).mockResolvedValue({
      preferences: {
        dailyEnabled: true,
        dailyMinute: 1080,
        weeklyEnabled: true,
        weeklyWeekday: 6,
        weeklyMinute: 1080,
        lastDailyLocalDate: null,
        lastWeeklyStartedOn: null,
        pendingDailyLocalDate: null,
        pendingWeekStartedOn: null,
      },
      newlyEnabled: true,
    });
    render(<I18nProvider initialLocale="en-US"><SettingsPage /></I18nProvider>);

    fireEvent.click(await screen.findByRole("checkbox", { name: "Daily review reminder" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Weekly review reminder" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(saveReviewReminderPreferences).toHaveBeenCalledWith("local-user", {
      dailyEnabled: true,
      dailyMinute: 1080,
      weeklyEnabled: true,
      weeklyWeekday: 6,
      weeklyMinute: 1080,
    }));
    expect(requestCoreHourNotifications).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveReviewReminderPreferences).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(requestCoreHourNotifications).mock.invocationCallOrder[0]);
    expect(await screen.findByText("Saved")).toBeTruthy();
  });

  it("requests permission even when a later CoreHour setting save fails", async () => {
    vi.mocked(saveReviewReminderPreferences).mockResolvedValue({
      preferences: {
        dailyEnabled: true,
        dailyMinute: 1080,
        weeklyEnabled: false,
        weeklyWeekday: 6,
        weeklyMinute: 1080,
        lastDailyLocalDate: null,
        lastWeeklyStartedOn: null,
        pendingDailyLocalDate: null,
        pendingWeekStartedOn: null,
      },
      newlyEnabled: true,
    });
    vi.mocked(saveDailyFocusGoal).mockRejectedValueOnce(new Error("write failed"));
    render(<I18nProvider initialLocale="en-US"><SettingsPage /></I18nProvider>);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Daily review reminder" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(requestCoreHourNotifications).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("CoreHour settings could not be saved.")).toBeTruthy();
  });
});
