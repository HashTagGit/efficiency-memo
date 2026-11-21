// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../lib/i18n";
import { ReviewReminderBridge } from "../review-reminder-bridge";
import { acknowledgeReviewReminders, claimReviewReminders } from "../../features/core-hour/review-reminder";
import { deliverDesktopReminder } from "../../lib/desktop-reminders";

vi.mock("../../lib/auth", () => ({ getCurrentUser: () => ({ id: "local-user" }) }));
vi.mock("../../lib/system-interruption", () => ({
  readSystemInterruptionState: vi.fn().mockResolvedValue({ notificationsAllowed: false, reason: "busy" }),
}));
vi.mock("../../features/core-hour/review-reminder", () => ({
  acknowledgeReviewReminders: vi.fn().mockResolvedValue(undefined),
  claimReviewReminders: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../lib/desktop-reminders", () => ({
  canDeliverDesktopReminder: vi.fn().mockResolvedValue(true),
  deliverDesktopReminder: vi.fn().mockResolvedValue(false),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Review reminder bridge", () => {
  it("passes supported system DND state to the authoritative claim", async () => {
    render(<I18nProvider initialLocale="en-US"><ReviewReminderBridge /></I18nProvider>);
    await waitFor(() => expect(claimReviewReminders).toHaveBeenCalledWith("local-user", false));
  });

  it("acknowledges a period only after its reminder is delivered", async () => {
    vi.mocked(claimReviewReminders).mockResolvedValueOnce([{
      kind: "weekly",
      acknowledgeKinds: ["weekly", "daily"],
    }]);
    vi.mocked(deliverDesktopReminder).mockResolvedValueOnce(true);
    render(<I18nProvider initialLocale="en-US"><ReviewReminderBridge /></I18nProvider>);
    await waitFor(() => expect(acknowledgeReviewReminders)
      .toHaveBeenCalledWith("local-user", ["weekly", "daily"]));
    expect(deliverDesktopReminder).toHaveBeenCalledWith(expect.objectContaining({ kind: "weekly-review" }));
    expect(vi.mocked(deliverDesktopReminder).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(acknowledgeReviewReminders).mock.invocationCallOrder[0]);
  });

  it("keeps the period pending when delivery fails", async () => {
    vi.mocked(claimReviewReminders).mockResolvedValueOnce([{
      kind: "daily",
      acknowledgeKinds: ["daily"],
    }]);
    vi.mocked(deliverDesktopReminder).mockResolvedValueOnce(false);
    render(<I18nProvider initialLocale="en-US"><ReviewReminderBridge /></I18nProvider>);
    await waitFor(() => expect(deliverDesktopReminder).toHaveBeenCalledTimes(1));
    expect(acknowledgeReviewReminders).not.toHaveBeenCalled();
  });
});
