// @vitest-environment jsdom

import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { afterEach, expect, it, vi } from "vitest";
import { DEFAULT_PET } from "../../lib/desktop-pet-catalog";
import { DesktopPet } from "../desktop-pet";
import { PetSprite } from "../pet-sprite";

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({
  Channel: class {
    constructor(onMessage: unknown) { connect(onMessage); }
  },
  invoke: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); vi.mocked(invoke).mockResolvedValue(undefined); });

it("keeps the character on screen before, during, and after a reminder", async () => {
  render(<DesktopPet />);
  const pet = screen.getByRole("img", { name: "EfficiencyMemo desktop pet" });
  const [publish] = connect.mock.lastCall ?? [];
  expect(typeof publish).toBe("function");
  expect(screen.queryByRole("region")).toBeNull();

  act(() => publish({
    current: { id: 7, kind: "hydration", title: "Hydration", body: "Time for water." },
    count: 1,
  }));
  expect(await screen.findByRole("region", { name: "Hydration" }, { timeout: 2000 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Hydration" }).classList.contains("sr-only")).toBe(true);
  expect(screen.getByRole("img")).toBe(pet);

  const close = screen.getByRole("button", { name: "Dismiss" });
  expect(close.textContent).toBe("");
  await act(async () => { fireEvent.click(close); });
  expect(invoke).toHaveBeenCalledWith("respond_to_desktop_pet_reminder", { id: 7, open: false });
  act(() => publish({ current: null, count: 0 }));
  expect(screen.queryByRole("region")).toBeNull();
  expect(screen.getByRole("img")).toBe(pet);
});

it("applies a new pet selection to the existing window", async () => {
  render(<DesktopPet />);
  const pet = screen.getByRole("img");
  const initialAtlas = pet.querySelector("span")?.style.backgroundImage;
  const [publish] = connect.mock.lastCall ?? [];
  act(() => publish({ current: null, count: 0, petId: "pocket-robot" }));
  await waitFor(() => expect(pet.querySelector("span")?.style.backgroundImage).not.toBe(initialAtlas));
  expect(screen.getByRole("img")).toBe(pet);
});

it("waves after a tap and sends drag events only after crossing the movement threshold", async () => {
  render(<DesktopPet />);
  const avatar = screen.getByRole("button", { name: "EfficiencyMemo desktop pet" });
  fireEvent.pointerDown(avatar, { pointerId: 1, button: 0, screenX: 30, screenY: 30 });
  fireEvent.pointerMove(avatar, { pointerId: 1, screenX: 33, screenY: 30 });
  fireEvent.pointerUp(avatar, { pointerId: 1, screenX: 33, screenY: 30 });
  expect(invoke).not.toHaveBeenCalledWith("drag_desktop_pet", expect.anything());
  expect(avatar.querySelector<HTMLElement>("[style]")?.style.backgroundPosition).toBe("0% 30%");

  fireEvent.pointerDown(avatar, { pointerId: 2, button: 0, screenX: 30, screenY: 30 });
  fireEvent.pointerMove(avatar, { pointerId: 2, screenX: 36, screenY: 30 });
  expect(avatar.classList.contains("outline-none")).toBe(true);
  fireEvent.pointerUp(avatar, { pointerId: 2, screenX: 40, screenY: 30 });
  expect(invoke).toHaveBeenCalledWith("drag_desktop_pet", { phase: "start", anchor: { x: 0, y: 0 } });
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("drag_desktop_pet", { phase: "end" }));
  await waitFor(() => expect(avatar.classList.contains("focus-visible:outline-2")).toBe(true));
});

it("keeps a snoozed reminder visible until the owning tool confirms the action", async () => {
  render(<DesktopPet />);
  const [publish] = connect.mock.lastCall ?? [];
  const current = { id: 12, kind: "break", title: "Break", body: "Time to stretch." };
  act(() => publish({ current, count: 1 }));
  const button = await screen.findByRole("button", { name: "Snooze for 10 minutes" }, { timeout: 2000 });
  await act(async () => { fireEvent.click(button); });
  expect(invoke).toHaveBeenCalledWith("snooze_desktop_pet_reminder", { id: 12 });
  expect(screen.getByRole("region", { name: "Break" })).toBeTruthy();
  act(() => publish({ current, count: 1, snoozeFailed: true }));
  expect(screen.getByText("Try again")).toBeTruthy();
});

it("shows working and waiting poses, and returns to idle when focus is paused", async () => {
  render(<DesktopPet />);
  const [publish] = connect.mock.lastCall ?? [];
  const sprite = () => screen.getByRole("img").querySelector("[data-pose]");
  const state = { current: null, count: 0, petId: "amber-cat" };
  await act(async () => { publish({ ...state, focus: "working" }); });
  expect(sprite()?.getAttribute("data-pose")).toBe("working");
  act(() => publish({ ...state, focus: "waiting" }));
  expect(sprite()?.getAttribute("data-pose")).toBe("waiting");
  act(() => publish({ ...state, focus: "paused" }));
  expect(sprite()?.getAttribute("data-pose")).toBe("idle");
});

it("wakes from the sleeping pose for a reminder and ignores gaze while the reminder is active", async () => {
  vi.mocked(invoke).mockImplementation(async (command) => command === "sample_desktop_pet_behavior"
    ? { sleeping: true, gaze: 4, walking: null } : undefined);
  render(<DesktopPet />);
  const [publish] = connect.mock.lastCall ?? [];
  const sprite = () => screen.getByRole("img").querySelector("[data-pose]");
  act(() => publish({ current: null, count: 0, petId: "amber-cat" }));
  await waitFor(() => expect(sprite()?.getAttribute("data-pose")).toBe("sleeping"));
  expect(screen.getByText("Z")).toBeTruthy();
  act(() => publish({ current: { id: 30, kind: "preview", title: "Test", body: "Reminder" }, count: 1 }));
  expect(sprite()?.getAttribute("data-pose")).toBe("alert");
  expect(screen.queryByText("Z")).toBeNull();
});

it("uses direction frames only for Codex Pet V2", () => {
  const v1 = { ...DEFAULT_PET, manifest: { ...DEFAULT_PET.manifest, spriteVersionNumber: 1 as const } };
  const { container, rerender } = render(<PetSprite pet={v1} gaze={12} />);
  expect(container.querySelector<HTMLElement>("[data-pose]")?.style.backgroundPosition).toBe("0% 0%");
  rerender(<PetSprite pet={DEFAULT_PET} gaze={12} />);
  expect(container.querySelector<HTMLElement>("[data-pose]")?.style.backgroundPosition).toBe(`${4 / 7 * 100}% 100%`);
});

it("asks the native behavior sampler to suppress motion when reduced motion is enabled", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  render(<DesktopPet />);
  const [publish] = connect.mock.lastCall ?? [];
  act(() => publish({ current: null, count: 0, petId: "amber-cat", preferences: { lookEnabled: true, walkEnabled: true } }));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("sample_desktop_pet_behavior", {
    input: { held: false, supportsLook: true, reducedMotion: true },
  }));
});

it("uses the visible mini pet as a peek control without starting a drag", async () => {
  render(<DesktopPet />);
  const [publish] = connect.mock.lastCall ?? [];
  await act(async () => { publish({ current: null, count: 0, petId: "amber-cat", mini: "right" }); });
  expect(screen.getByRole("img").querySelector('[data-pose="peeking"]')).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Show full desktop pet" }));
  expect(invoke).toHaveBeenCalledWith("peek_desktop_pet");
  expect(invoke).not.toHaveBeenCalledWith("drag_desktop_pet", expect.anything());
});

it("keeps an inward gaze until a nearby cursor changes it and preserves the sprite element", () => {
  vi.useFakeTimers();
  const { container, rerender } = render(<PetSprite pet={DEFAULT_PET} animated peekSide="left" />);
  const sprite = container.querySelector("[data-pet-frame]");
  expect(sprite?.getAttribute("data-pet-frame")).toBe("9:4");
  rerender(<PetSprite pet={DEFAULT_PET} animated peekSide="left" gaze={3} />);
  expect(sprite?.getAttribute("data-pet-frame")).toBe("9:3");
  rerender(<PetSprite pet={DEFAULT_PET} animated peekSide="left" />);
  expect(sprite?.getAttribute("data-pet-frame")).toBe("9:4");
  rerender(<PetSprite pet={DEFAULT_PET} animated peekSide="right" />);
  expect(container.querySelector("[data-pet-frame]")).toBe(sprite);
  expect(sprite?.getAttribute("data-pet-frame")).toBe("10:4");
});

it("updates the gaze near a docked pet without opening it", async () => {
  vi.mocked(invoke).mockImplementation(async (command) => command === "sample_desktop_pet_behavior"
    ? { sleeping: false, gaze: 14, walking: null } : undefined);
  render(<DesktopPet />);
  const [publish] = connect.mock.lastCall ?? [];
  act(() => publish({
    current: null, count: 0, petId: "amber-cat", mini: "right", dock: "right",
    preferences: { lookEnabled: true, walkEnabled: true, miniEnabled: true },
  }));
  const sprite = screen.getByRole("img").querySelector("[data-pet-frame]");
  await waitFor(() => expect(sprite?.getAttribute("data-pet-frame")).toBe("10:6"));
  expect(screen.getByRole("button", { name: "Show full desktop pet" })).toBeTruthy();
  expect(invoke).not.toHaveBeenCalledWith("peek_desktop_pet");
});

it("uses a small nod for a V1 pet in place of direction frames and skips it in reduced motion", () => {
  vi.useFakeTimers();
  const pet = { ...DEFAULT_PET, manifest: { ...DEFAULT_PET.manifest, spriteVersionNumber: 1 as const } };
  const { container, rerender } = render(<PetSprite pet={pet} animated peekSide="left" />);
  const sprite = container.querySelector("[data-pet-frame]");
  act(() => vi.advanceTimersByTime(4200));
  expect(sprite?.hasAttribute("data-peek-nod")).toBe(true);
  expect(sprite?.getAttribute("data-pet-frame")).toBe("0:0");
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  rerender(<PetSprite pet={pet} animated peekSide="right" />);
  act(() => vi.advanceTimersByTime(5000));
  expect(sprite?.hasAttribute("data-peek-nod")).toBe(false);
});

it("loads the selected variant atlas in the desktop pet window", async () => {
  render(<DesktopPet />);
  const pet = screen.getByRole("img");
  const [publish] = connect.mock.lastCall ?? [];
  await act(async () => { publish({ current: null, count: 0, petId: "mole-baby", petVariant: "seed" }); });
  await waitFor(() => expect(pet.querySelector("span")?.style.backgroundImage).toContain("mole-baby/variants/seed.png"));
  act(() => publish({ current: null, count: 0, petId: "mole-baby", petVariant: "middle" }));
  await waitFor(() => expect(pet.querySelector("span")?.style.backgroundImage).toContain("mole-baby/variants/middle.png"));
});

it("sleeps a variant on its declared sleeping frame", async () => {
  vi.mocked(invoke).mockImplementation(async (command) => command === "sample_desktop_pet_behavior"
    ? { sleeping: true, gaze: null, walking: null } : undefined);
  render(<DesktopPet />);
  const [publish] = connect.mock.lastCall ?? [];
  act(() => publish({ current: null, count: 0, petId: "mole-baby", petVariant: "seed" }));
  await waitFor(() => expect(screen.getByRole("img").querySelector("[data-pose]")?.getAttribute("data-pose")).toBe("sleeping"));
  expect(screen.getByRole("img").querySelector("[data-pet-frame]")?.getAttribute("data-pet-frame")).toBe("0:3");
});

it("honours a per-pet sleeping frame for a single-sheet pet", () => {
  const pet = { ...DEFAULT_PET, sleepingFrame: { row: 0, column: 3 } };
  const { container } = render(<PetSprite pet={pet} pose="sleeping" />);
  expect(container.querySelector("[data-pet-frame]")?.getAttribute("data-pet-frame")).toBe("0:3");
});
