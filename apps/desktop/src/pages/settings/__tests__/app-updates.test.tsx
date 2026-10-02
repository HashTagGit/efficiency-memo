// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../../lib/i18n";
import { AppUpdates } from "../app-updates";

const mocks = vi.hoisted(() => ({
  check: vi.fn(), download: vi.fn(), install: vi.fn(), close: vi.fn(),
  invoke: vi.fn(), relaunch: vi.fn(), active: false,
}));
vi.mock("@tauri-apps/api/app", () => ({ getVersion: async () => "0.2.0" }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true, invoke: mocks.invoke }));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: mocks.check }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: mocks.relaunch }));
vi.mock("../../../features/core-hour/hooks/use-session", () => ({
  useSession: () => ({ activeSession: mocks.active ? { id: "active" } : null }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.active = false;
  mocks.close.mockResolvedValue(undefined);
  mocks.install.mockResolvedValue(undefined);
  mocks.invoke.mockResolvedValue(undefined);
  mocks.relaunch.mockResolvedValue(undefined);
  mocks.check.mockResolvedValue({
    version: "0.3.0", body: "Reminder improvements", close: mocks.close,
    download: mocks.download, install: mocks.install,
  });
});
afterEach(cleanup);

function openSettings() {
  return render(<I18nProvider initialLocale="en-US"><AppUpdates /></I18nProvider>);
}

describe("application updates", () => {
  it("reports latest only after a successful check with no update", async () => {
    mocks.check.mockResolvedValue(null);
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));
    expect(await screen.findByText("You are on the latest available version.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Download update" })).toBeNull();
  });

  it("keeps a failed check recoverable without claiming that no update exists", async () => {
    mocks.check.mockRejectedValueOnce(new Error("404 update manifest missing"));
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("You are on the latest available version.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));
    expect(await screen.findByText("Version 0.3.0 is available.")).toBeTruthy();
  });

  it("downloads with progress and requires an explicit install and restart action", async () => {
    mocks.download.mockImplementation(async (onEvent: (event: { event: string; data: { contentLength?: number; chunkLength?: number } }) => void) => {
      onEvent({ event: "Started", data: { contentLength: 100 } });
      onEvent({ event: "Progress", data: { chunkLength: 50 } });
    });
    const view = openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));
    fireEvent.click(await screen.findByRole("button", { name: "Download update" }));
    const installButton = await screen.findByRole("button", { name: "Install and restart" });
    expect(mocks.install).not.toHaveBeenCalled();
    mocks.active = true;
    view.rerender(<I18nProvider initialLocale="en-US"><AppUpdates /></I18nProvider>);
    expect((installButton as HTMLButtonElement).disabled).toBe(true);
    mocks.active = false;
    view.rerender(<I18nProvider initialLocale="en-US"><AppUpdates /></I18nProvider>);
    fireEvent.click(installButton);
    await waitFor(() => expect(mocks.relaunch).toHaveBeenCalledOnce());
    expect(mocks.invoke).toHaveBeenCalledWith("ensure_update_installable");
    expect(mocks.install).toHaveBeenCalledWith({ restartAfterInstall: true });
  });

  it("does not install if a native session check detects a newly active session", async () => {
    mocks.download.mockResolvedValue(undefined);
    mocks.invoke.mockRejectedValue("active-session");
    openSettings();
    fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));
    fireEvent.click(await screen.findByRole("button", { name: "Download update" }));
    fireEvent.click(await screen.findByRole("button", { name: "Install and restart" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "End your active focus session before installing the update.");
    expect(mocks.install).not.toHaveBeenCalled();
  });
});
