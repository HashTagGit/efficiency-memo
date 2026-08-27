// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../../lib/i18n";
import { dbSelect } from "../../../lib/db";
import { CoreHourRuntimeProvider, useCoreHourLoadState } from "../runtime";

vi.mock("../../../lib/auth", () => ({
  getCurrentUser: () => ({ id: "local-user" }),
}));

vi.mock("../../../lib/db", () => ({
  dbExecute: vi.fn(),
  dbSelect: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

function RuntimeProbe() {
  const { loading, loadError, refresh } = useCoreHourLoadState();
  return (
    <div>
      <span>{loading ? "loading" : loadError ? "error" : "ready"}</span>
      <button type="button" onClick={() => void refresh()}>retry</button>
    </div>
  );
}

describe("CoreHour runtime load state", () => {
  it("blocks on an initialization failure and recovers after retry", async () => {
    vi.mocked(dbSelect)
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValue([]);

    render(
      <I18nProvider initialLocale="en-US">
        <CoreHourRuntimeProvider>
          <RuntimeProbe />
        </CoreHourRuntimeProvider>
      </I18nProvider>,
    );

    expect(await screen.findByText("error")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "retry" }));

    await waitFor(() => expect(dbSelect).toHaveBeenCalledTimes(4));
    expect(await screen.findByText("ready")).toBeTruthy();
  });
});
