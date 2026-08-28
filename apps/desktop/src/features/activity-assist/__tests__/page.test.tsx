// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../../lib/i18n";
import {
  clearActivityAssistSamples,
  loadActivityAssistState,
  saveActivityAssistPreferences,
} from "../data";
import ActivityAssistPage from "../activity-assist-page";
import type { ActivityAssistState } from "../types";

vi.mock("../data", () => ({
  clearActivityAssistSamples: vi.fn(),
  loadActivityAssistState: vi.fn(),
  saveActivityAssistPreferences: vi.fn(),
}));

const initialState: ActivityAssistState = {
  preferences: { enabled: false, paused: false, retentionHours: 72 },
  exclusions: [],
  recentSamples: [],
  sampleCount: 0,
  collectorAvailable: true,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Activity Assist settings", () => {
  it("keeps collection opt-in and normalizes exclusions before saving", async () => {
    vi.mocked(loadActivityAssistState).mockResolvedValue(initialState);
    vi.mocked(saveActivityAssistPreferences).mockResolvedValue({
      ...initialState,
      preferences: { ...initialState.preferences, enabled: true },
      exclusions: ["secret.exe"],
    });
    vi.mocked(clearActivityAssistSamples).mockResolvedValue(initialState);

    render(
      <I18nProvider initialLocale="en-US">
        <ActivityAssistPage userId="local-user" />
      </I18nProvider>,
    );

    expect(await screen.findByText("Activity Assist")).toBeTruthy();
    const enabled = screen.getByRole("checkbox", { name: "Enable collection" });
    expect((enabled as HTMLInputElement).checked).toBe(false);
    fireEvent.click(enabled);
    fireEvent.change(screen.getByPlaceholderText("application.exe"), { target: { value: " Secret.EXE " } });
    fireEvent.click(screen.getByRole("button", { name: "Add exclusion" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Activity Assist" }));

    await waitFor(() => expect(saveActivityAssistPreferences).toHaveBeenCalledWith(
      "local-user",
      { enabled: true, paused: false, retentionHours: 72 },
      ["secret.exe"],
    ));
  });
});
