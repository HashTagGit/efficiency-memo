// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../../lib/i18n";
import { dbSelect } from "../../../lib/db";
import HistoryPage from "../pages/history-page";

vi.mock("../../../lib/db", () => ({
  dbExecute: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("../today-data", () => ({
  loadSessionsForDays: vi.fn().mockResolvedValue([[]]),
  totalSessionSeconds: vi.fn(() => 0),
}));

vi.mock("../planned-blocks", () => ({
  layoutPlannedBlocks: vi.fn(() => []),
  loadPlansForRange: vi.fn().mockResolvedValue([]),
  updatePlannedBlockRange: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CoreHour Timeline states", () => {
  it("keeps failed range data hidden and recovers after retry", async () => {
    vi.mocked(dbSelect)
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValue([]);

    render(
      <I18nProvider initialLocale="en-US">
        <HistoryPage userId="local-user" />
      </I18nProvider>,
    );

    expect(await screen.findByText("Timeline could not be loaded")).toBeTruthy();
    expect(screen.queryByLabelText("Timeline legend")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(dbSelect).toHaveBeenCalledTimes(4));
    expect(await screen.findByLabelText("Timeline legend")).toBeTruthy();
  });
});
