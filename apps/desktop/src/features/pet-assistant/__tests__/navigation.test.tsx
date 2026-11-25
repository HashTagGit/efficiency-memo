// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "../../../App";
import { AppearanceProvider } from "../../../lib/appearance";
import { BUNDLED_COLLECTIONS, DEFAULT_PET, loadDesktopPetSelection, loadDesktopPetSprite, loadImportedDesktopPets, saveDesktopPetSelection } from "../../../lib/desktop-pet-catalog";
import { readPetPack } from "../../../lib/codex-pet";
import { loadDesktopPetBehavior, saveDesktopPetBehavior, showDesktopPetReminder, supportsDesktopPet } from "../../../lib/desktop-reminders";
import { I18nProvider, translate, useI18n } from "../../../lib/i18n";
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
vi.mock("../../../lib/desktop-reminders", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../lib/desktop-reminders")>(),
  supportsDesktopPet: vi.fn(() => true),
  desktopPetEnabled: vi.fn().mockResolvedValue(true),
  loadDesktopPetBehavior: vi.fn().mockResolvedValue({ lookEnabled: false, walkEnabled: false, miniEnabled: false, bubbleStyle: "classic" }),
  saveDesktopPetBehavior: vi.fn().mockResolvedValue(undefined),
  showDesktopPetReminder: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../lib/desktop-pet-catalog", async (importOriginal) => {
  const catalog = await importOriginal<typeof import("../../../lib/desktop-pet-catalog")>();
  return {
    ...catalog,
    loadDesktopPetSprite: vi.fn(catalog.loadDesktopPetSprite),
    loadDesktopPetSelection: vi.fn().mockResolvedValue({ petId: "amber-cat", variantId: null }),
    loadImportedDesktopPets: vi.fn().mockResolvedValue([]),
    saveDesktopPetSelection: vi.fn().mockResolvedValue(undefined),
    saveImportedDesktopPet: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock("../../../lib/codex-pet", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../lib/codex-pet")>(),
  readPetPack: vi.fn(),
}));

afterEach(() => {
  cleanup();
  clearRegistry();
  vi.clearAllMocks();
});

function renderApp(path: string, locale: "en-US" | "zh-CN" = "en-US") {
  window.history.replaceState(null, "", path);
  return render(<I18nProvider initialLocale={locale}><AppearanceProvider><TestLocaleSwitch /><App /></AppearanceProvider></I18nProvider>);
}

function TestLocaleSwitch() {
  const { toggleLocale } = useI18n();
  return <button onClick={toggleLocale}>Test language switch</button>;
}

it("opens the separate pet page from Tools and keeps pet controls out of app settings", async () => {
  await discoverTools();
  renderApp("/settings");
  expect(screen.getByRole("heading", { name: "Desktop shortcuts" })).toBeTruthy();
  expect(screen.queryByRole("group", { name: "Pet library" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Pet Assistant" }));
  expect(await screen.findByRole("heading", { name: "Pet Assistant" })).toBeTruthy();
  expect(window.location.pathname).toBe("/tools/pet-assistant");
  const look = await screen.findByRole<HTMLInputElement>("checkbox", { name: "Follow nearby pointer" });
  const walk = screen.getByRole<HTMLInputElement>("checkbox", { name: "Walk along screen edges" });
  expect(look.checked).toBe(false);
  expect(walk.checked).toBe(false);
  fireEvent.click(look);
  await waitFor(() => expect(saveDesktopPetBehavior).toHaveBeenCalledWith({ lookEnabled: true, walkEnabled: false, miniEnabled: false, bubbleStyle: "classic" }));
  const robot = await screen.findByRole("radio", { name: "Pocket Robot" });
  fireEvent.click(robot);
  await waitFor(() => expect(saveDesktopPetSelection).toHaveBeenCalledWith("pocket-robot", null));
  await waitFor(() => expect((robot as HTMLInputElement).checked).toBe(true));
  fireEvent.click(screen.getByRole("button", { name: "Mole Baby" }));
  expect(saveDesktopPetSelection).toHaveBeenCalledTimes(1);
  expect(within(screen.getByRole("group", { name: "Current desktop pet" })).getByText("Pocket Robot")).toBeTruthy();
  const mole = screen.getByRole<HTMLInputElement>("radio", { name: "Middle Lamu" });
  fireEvent.click(mole);
  await waitFor(() => expect(saveDesktopPetSelection).toHaveBeenCalledWith("mole-baby", "middle"));
  await waitFor(() => expect(mole.checked).toBe(true));
  fireEvent.click(screen.getByRole("button", { name: "Clawd on Desk" }));
  const clawd = screen.getByRole<HTMLInputElement>("radio", { name: "Clawd" });
  fireEvent.click(clawd);
  await waitFor(() => expect(saveDesktopPetSelection).toHaveBeenCalledWith("clawd", "clawd"));
  await waitFor(() => expect(clawd.checked).toBe(true));
  const radios = within(screen.getByRole("group", { name: "Pet library" })).getAllByRole<HTMLInputElement>("radio");
  expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
  expect(radios.filter((radio) => radio.checked)).toEqual([clawd]);
  expect(document.activeElement).toBe(clawd);
  const working = await screen.findByRole<HTMLButtonElement>("button", { name: "Working" });
  await waitFor(() => expect(working.disabled).toBe(false));
  fireEvent.click(working);
  expect(working.getAttribute("aria-pressed")).toBe("true");

  expect(screen.getByRole("button", { name: "Import a pet pack" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Test hydration reminder" }));
  await waitFor(() => expect(showDesktopPetReminder).toHaveBeenCalledWith(expect.objectContaining({ kind: "preview" })));
  await waitFor(() => expect(screen.getByRole<HTMLButtonElement>("button", { name: "Test movement reminder" }).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Test movement reminder" }));
  await waitFor(() => expect(showDesktopPetReminder).toHaveBeenCalledWith(expect.objectContaining({ kind: "preview-break" })));
});

it("restores the bubble style and saves a new style with the other pet preferences", async () => {
  vi.mocked(loadDesktopPetBehavior).mockResolvedValueOnce({
    lookEnabled: true, walkEnabled: false, miniEnabled: true, bubbleStyle: "pixel",
  });
  await discoverTools();
  renderApp("/tools/pet-assistant", "zh-CN");
  const picker = await screen.findByRole<HTMLSelectElement>("combobox", { name: "提醒气泡风格" });
  await waitFor(() => expect(picker.value).toBe("pixel"));
  expect([...picker.options].map((option) => option.value)).toEqual(["classic", "argos", "shimeji", "pixel"]);
  fireEvent.change(picker, { target: { value: "shimeji" } });
  await waitFor(() => expect(picker.value).toBe("shimeji"));
  expect(saveDesktopPetBehavior).toHaveBeenCalledWith({
    lookEnabled: true, walkEnabled: false, miniEnabled: true, bubbleStyle: "shimeji",
  });
});

it("keeps the motion controls in place while a newly selected pet loads", async () => {
  await discoverTools();
  renderApp("/tools/pet-assistant");
  const working = await screen.findByRole<HTMLButtonElement>("button", { name: "Working" });
  await waitFor(() => expect(working.disabled).toBe(false));
  let finishLoading!: (pet: typeof DEFAULT_PET) => void;
  vi.mocked(loadDesktopPetSprite).mockReturnValueOnce(new Promise((resolve) => { finishLoading = resolve; }));

  const robot = screen.getByRole<HTMLInputElement>("radio", { name: "Pocket Robot" });
  fireEvent.click(robot);
  await waitFor(() => expect(robot.checked).toBe(true));
  const pending = screen.getByRole<HTMLButtonElement>("button", { name: "Working" });
  expect(pending.disabled).toBe(true);
  expect(document.activeElement).toBe(robot);

  finishLoading({ ...DEFAULT_PET, manifest: { ...DEFAULT_PET.manifest, id: "pocket-robot" } });
  await waitFor(() => expect(pending.disabled).toBe(false));
});

it("restores the saved series and translates its copy without switching pets", async () => {
  vi.mocked(loadDesktopPetSelection).mockResolvedValueOnce({ petId: "mole-baby", variantId: "middle" });
  await discoverTools();
  renderApp("/tools/pet-assistant", "zh-CN");
  const mole = await screen.findByRole<HTMLInputElement>("radio", { name: "中级拉姆" });
  expect(mole.checked).toBe(true);
  expect(screen.getByText("拉姆 · 中级拉姆")).toBeTruthy();
  expect(screen.getByText("从种子期到成长阶段，再到五种进化形态。")).toBeTruthy();
  expect(screen.getByTitle("长出两片嫩叶的拉姆。")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Clawd 桌宠" }).getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "Test language switch" }));
  expect(screen.getByText("Mole Baby · Middle Lamu")).toBeTruthy();
  expect(screen.getByTitle("Lamu with two new leaves.")).toBeTruthy();
  expect(screen.getByRole<HTMLInputElement>("radio", { name: "Middle Lamu" }).checked).toBe(true);
  expect(saveDesktopPetSelection).not.toHaveBeenCalled();
});

it("has distinct Chinese and English descriptions for all bundled series and forms", () => {
  for (const collection of BUNDLED_COLLECTIONS) {
    const base = `desktopPet.pet.${collection.manifest.id}`;
    for (const key of [`${base}.description`, ...collection.variants.map(({ id }) => `${base}.variant.${id}.description`)]) {
      expect(translate("en-US", key)).not.toBe(key);
      expect(translate("zh-CN", key)).toMatch(/\p{Script=Han}/u);
    }
  }
});

it("applies an imported series and focuses its original named form", async () => {
  const manifest = { id: "forest-pals", displayName: "Forest Pals", description: "Original author description.", defaultVariant: "fern" };
  const variant = { id: "fern", displayName: "Little Fern", description: "Original form description.", thumbnail: "data:image/png;base64,eA==" };
  vi.mocked(loadImportedDesktopPets)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ kind: "collection", ...manifest, variants: [variant] }]);
  vi.mocked(readPetPack).mockResolvedValueOnce({ manifest: { ...manifest, spriteVersionNumber: 3, variants: [] }, variants: [] });
  await discoverTools();
  const { container } = renderApp("/tools/pet-assistant", "zh-CN");
  await waitFor(() => expect(screen.getByRole<HTMLButtonElement>("button", { name: "导入宠物包" }).disabled).toBe(false));
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("Missing pet import input");
  const scrollIntoView = vi.fn();
  Object.defineProperty(HTMLLabelElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });
  try {
    fireEvent.change(input, { target: { files: [new File(["pack"], "forest-pals.zip")] } });
    const imported = await screen.findByRole<HTMLInputElement>("radio", { name: "Little Fern" });
    await waitFor(() => expect(document.activeElement).toBe(imported));
    expect(imported.checked).toBe(true);
    expect(scrollIntoView.mock.contexts).toEqual([imported.closest("label")]);
  } finally {
    Reflect.deleteProperty(HTMLLabelElement.prototype, "scrollIntoView");
  }
  expect(screen.getByText("Forest Pals · Little Fern")).toBeTruthy();
  expect(screen.getByText("Original author description.")).toBeTruthy();
  expect(saveDesktopPetSelection).toHaveBeenCalledWith("forest-pals", "fern");
});

it("handles a direct pet page link when the desktop pet is unavailable", async () => {
  vi.mocked(supportsDesktopPet).mockReturnValueOnce(false).mockReturnValueOnce(false);
  await discoverTools();
  renderApp("/tools/pet-assistant");
  expect(await screen.findByText("Desktop pets are available in the Windows app.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Pet Assistant" })).toBeNull();
});
