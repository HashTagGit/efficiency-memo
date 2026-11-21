// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "../../../App";
import { AppearanceProvider } from "../../../lib/appearance";
import { saveDesktopPetSelection } from "../../../lib/desktop-pet-catalog";
import { saveDesktopPetBehavior, showDesktopPetReminder, supportsDesktopPet } from "../../../lib/desktop-reminders";
import { I18nProvider } from "../../../lib/i18n";
import { discoverTools } from "../../../lib/tool-registry/discovery";
import { clearRegistry } from "../../../lib/tool-registry/registry";
import type { ShellProps } from "@memo/ui";

vi.mock("@memo/ui", async (importOriginal) => ({
  ...await importOriginal<typeof import("@memo/ui")>(),
  Shell: ({ tools, onToolSelect, children }: ShellProps) => (
    <>
      {tools.map((tool) => <button key={tool.id} type="button" onClick={() => onToolSelect(tool.id)}>{tool.name}</button>)}
      {children}
    </>
  ),
}));

vi.mock("../../../components/desktop-companion-bridge", () => ({ DesktopCompanionBridge: () => null }));
vi.mock("../../../components/review-reminder-bridge", () => ({ ReviewReminderBridge: () => null }));
vi.mock("../../../pages/settings/app-updates", () => ({ AppUpdates: () => null }));
vi.mock("../../../lib/desktop-reminders", () => ({
  supportsDesktopPet: vi.fn(() => true),
  desktopPetEnabled: vi.fn().mockResolvedValue(true),
  loadDesktopPetBehavior: vi.fn().mockResolvedValue({ lookEnabled: false, walkEnabled: false, miniEnabled: false }),
  saveDesktopPetBehavior: vi.fn().mockResolvedValue(undefined),
  showDesktopPetReminder: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../lib/desktop-pet-catalog", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../lib/desktop-pet-catalog")>(),
  loadDesktopPetSelection: vi.fn().mockResolvedValue("amber-cat"),
  loadImportedDesktopPets: vi.fn().mockResolvedValue([]),
  saveDesktopPetSelection: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  cleanup();
  clearRegistry();
  vi.clearAllMocks();
});

function renderApp(path: string, locale: "en-US" | "zh-CN" = "en-US") {
  window.history.replaceState(null, "", path);
  return render(<I18nProvider initialLocale={locale}><AppearanceProvider><App /></AppearanceProvider></I18nProvider>);
}

it("opens the separate pet page from Tools and keeps pet controls out of app settings", async () => {
  await discoverTools();
  renderApp("/settings");
  expect(screen.getByRole("heading", { name: "Desktop shortcuts" })).toBeTruthy();
  expect(screen.queryByRole("group", { name: "Choose a pet" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Pet Assistant" }));
  expect(await screen.findByRole("heading", { name: "Pet Assistant" })).toBeTruthy();
  expect(window.location.pathname).toBe("/tools/pet-assistant");
  const look = await screen.findByRole<HTMLInputElement>("checkbox", { name: "Follow nearby pointer" });
  const walk = screen.getByRole<HTMLInputElement>("checkbox", { name: "Walk along screen edges" });
  expect(look.checked).toBe(false);
  expect(walk.checked).toBe(false);
  fireEvent.click(look);
  await waitFor(() => expect(saveDesktopPetBehavior).toHaveBeenCalledWith({ lookEnabled: true, walkEnabled: false, miniEnabled: false }));
  const robot = await screen.findByRole("radio", { name: "Pocket Robot" });
  fireEvent.click(robot);
  await waitFor(() => expect(saveDesktopPetSelection).toHaveBeenCalledWith("pocket-robot"));
  await waitFor(() => expect((robot as HTMLInputElement).checked).toBe(true));
  const mole = screen.getByRole<HTMLInputElement>("radio", { name: "Mole Baby" });
  fireEvent.click(mole);
  await waitFor(() => expect(saveDesktopPetSelection).toHaveBeenCalledWith("mole-baby"));
  await waitFor(() => expect(mole.checked).toBe(true));
  const clawd = screen.getByRole<HTMLInputElement>("radio", { name: "Clawd" });
  fireEvent.click(clawd);
  await waitFor(() => expect(saveDesktopPetSelection).toHaveBeenCalledWith("clawd"));
  await waitFor(() => expect(clawd.checked).toBe(true));
  const working = await screen.findByRole("button", { name: "Working" });
  fireEvent.click(working);
  expect(working.getAttribute("aria-pressed")).toBe("true");

  expect(screen.getByRole("button", { name: "Import a pet pack" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Send a test reminder" }));
  await waitFor(() => expect(showDesktopPetReminder).toHaveBeenCalledWith(expect.objectContaining({ kind: "preview" })));
});

it("shows localized labels for the bundled third-party pets", async () => {
  await discoverTools();
  renderApp("/tools/pet-assistant", "zh-CN");
  expect(await screen.findByRole("radio", { name: "拉姆" })).toBeTruthy();
  expect(screen.getByRole("radio", { name: "Clawd" })).toBeTruthy();
});

it("handles a direct pet page link when the desktop pet is unavailable", async () => {
  vi.mocked(supportsDesktopPet).mockReturnValueOnce(false).mockReturnValueOnce(false);
  await discoverTools();
  renderApp("/tools/pet-assistant");
  expect(await screen.findByText("Desktop pets are available in the Windows app.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Pet Assistant" })).toBeNull();
});
