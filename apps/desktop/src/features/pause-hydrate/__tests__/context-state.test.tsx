// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../../lib/i18n";
import { loadPauseHydrateState } from "../data";
import { PauseHydrateProvider, usePauseHydrate } from "../context";
import type { PauseHydrateState } from "../types";

vi.mock("../../../lib/auth", () => ({
  getCurrentUser: () => ({ id: "local-user" }),
}));

vi.mock("../../../lib/system-idle", () => ({
  readSystemIdleSeconds: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../../lib/system-interruption", () => ({
  readSystemInterruptionState: vi.fn().mockResolvedValue(null),
}));

vi.mock("../notifications", () => ({
  reminderNotificationPermission: vi.fn().mockResolvedValue("granted"),
  requestReminderNotifications: vi.fn().mockResolvedValue("granted"),
  sendReminderNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../data", () => ({
  actOnReminder: vi.fn(),
  completeNaturalBreak: vi.fn(),
  loadPauseHydrateState: vi.fn(),
  markNewPendingReminders: vi.fn().mockResolvedValue([]),
  saveReminderPreferences: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function StateProbe() {
  const { state, loading, loadError, refresh } = usePauseHydrate();
  const status = loading ? "loading" : loadError ? "error" : state ? "ready" : "empty";
  return (
    <div>
      <span>{status}</span>
      <button type="button" onClick={() => void refresh()}>retry</button>
    </div>
  );
}

describe("PauseHydrateProvider load state", () => {
  it("exits initial loading and recovers after a retry", async () => {
    vi.mocked(loadPauseHydrateState)
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce({} as PauseHydrateState);

    render(
      <I18nProvider initialLocale="en-US">
        <PauseHydrateProvider>
          <StateProbe />
        </PauseHydrateProvider>
      </I18nProvider>,
    );

    expect(await screen.findByText("error")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "retry" }));

    await waitFor(() => expect(loadPauseHydrateState).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("ready")).toBeTruthy();
  });
});
