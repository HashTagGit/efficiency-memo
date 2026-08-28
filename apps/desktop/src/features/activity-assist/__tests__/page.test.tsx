// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../../lib/i18n";
import {
  acceptActivityAssistSuggestion,
  clearActivityAssistSamples,
  deleteActivityAssistRule,
  dismissActivityAssistSuggestion,
  loadActivityAssistState,
  saveActivityAssistRule,
  saveActivityAssistPreferences,
} from "../data";
import ActivityAssistPage from "../activity-assist-page";
import { TagsProvider } from "../../core-hour/hooks/use-tags";
import type { ActivityAssistState } from "../types";

vi.mock("../data", () => ({
  acceptActivityAssistSuggestion: vi.fn(),
  clearActivityAssistSamples: vi.fn(),
  deleteActivityAssistRule: vi.fn(),
  dismissActivityAssistSuggestion: vi.fn(),
  loadActivityAssistState: vi.fn(),
  saveActivityAssistRule: vi.fn(),
  saveActivityAssistPreferences: vi.fn(),
}));

vi.mock("../../core-hour/hooks/use-tags", () => ({
  TagsProvider: ({ children }: { children: React.ReactNode }) => children,
  useTags: () => ({
    tags: [{
      id: "tag-1",
      user_id: "local-user",
      name: "Focus",
      color: "#176b87",
      is_archived: false,
      created_at: "2026-08-28T08:00:00.000Z",
      synced: false,
    }],
  }),
}));

const initialState: ActivityAssistState = {
  preferences: { enabled: false, paused: false, retentionHours: 72 },
  exclusions: [],
  recentSamples: [],
  pendingSuggestions: [],
  rules: [],
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
        <TagsProvider><ActivityAssistPage userId="local-user" /></TagsProvider>
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

  it("requires review before a suggestion becomes a Core Hour session", async () => {
    const suggested: ActivityAssistState = {
      ...initialState,
      pendingSuggestions: [{
        id: "suggestion:sample-1",
        applicationId: "code.exe",
        startedAt: "2026-08-28T08:00:00.000Z",
        endedAt: "2026-08-28T08:03:00.000Z",
        suggestedActivity: "Planning",
        suggestedTagId: "tag-1",
        ruleApplied: false,
      }],
    };
    vi.mocked(loadActivityAssistState).mockResolvedValue(suggested);
    vi.mocked(acceptActivityAssistSuggestion).mockResolvedValue(initialState);
    vi.mocked(dismissActivityAssistSuggestion).mockResolvedValue(initialState);

    render(
      <I18nProvider initialLocale="en-US">
        <TagsProvider><ActivityAssistPage userId="local-user" /></TagsProvider>
      </I18nProvider>,
    );

    expect(await screen.findByText("Review suggestions")).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "Tag" }) as HTMLSelectElement).value).toBe("tag-1");
    fireEvent.change(screen.getByLabelText("Activity"), { target: { value: "Implementation" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Remember these values for this app" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to Core Hour" }));

    await waitFor(() => expect(acceptActivityAssistSuggestion).toHaveBeenCalledWith(expect.objectContaining({
      userId: "local-user",
      suggestionId: "suggestion:sample-1",
      activity: "Implementation",
      defaultTagId: "tag-1",
      rememberRule: true,
      startLocalDate: "2026-08-28",
      endLocalDate: "2026-08-28",
    })));
  });

  it("edits and deletes a saved application rule", async () => {
    const ruled: ActivityAssistState = {
      ...initialState,
      rules: [{ applicationId: "code.exe", activity: "Planning", defaultTagId: null }],
      pendingSuggestions: [{
        id: "suggestion:sample-2",
        applicationId: "code.exe",
        startedAt: "2026-08-28T09:00:00.000Z",
        endedAt: "2026-08-28T09:03:00.000Z",
        suggestedActivity: "Planning",
        suggestedTagId: null,
        ruleApplied: true,
      }],
    };
    const updated: ActivityAssistState = {
      ...ruled,
      rules: [{ applicationId: "code.exe", activity: "Implementation", defaultTagId: null }],
      pendingSuggestions: [{ ...ruled.pendingSuggestions[0], suggestedActivity: "Implementation" }],
    };
    vi.mocked(loadActivityAssistState).mockResolvedValue(ruled);
    vi.mocked(saveActivityAssistRule).mockResolvedValue(updated);
    vi.mocked(deleteActivityAssistRule).mockResolvedValue(initialState);

    render(
      <I18nProvider initialLocale="en-US">
        <TagsProvider><ActivityAssistPage userId="local-user" /></TagsProvider>
      </I18nProvider>,
    );

    const activityInputs = await screen.findAllByLabelText("Activity");
    fireEvent.change(activityInputs[1], { target: { value: "Implementation" } });
    fireEvent.click(screen.getByRole("button", { name: "Save rule" }));
    await waitFor(() => expect(saveActivityAssistRule).toHaveBeenCalledWith({
      userId: "local-user",
      applicationId: "code.exe",
      activity: "Implementation",
      defaultTagId: null,
    }));
    await waitFor(() => expect((screen.getAllByLabelText("Activity")[0] as HTMLInputElement).value).toBe("Implementation"));

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteActivityAssistRule).toHaveBeenCalledWith("local-user", "code.exe"));
  });
});
