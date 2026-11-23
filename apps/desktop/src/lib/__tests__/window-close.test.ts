import { invoke } from "@tauri-apps/api/core";
import { afterEach, expect, it, vi } from "vitest";
import { dbExecute, dbSelect } from "../db";
import { loadWindowCloseBehavior, saveWindowCloseBehavior } from "../window-close";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("../db", () => ({ dbExecute: vi.fn(), dbSelect: vi.fn() }));

afterEach(() => vi.resetAllMocks());

it("preserves exit as the default and restores a saved tray preference", async () => {
  vi.mocked(dbSelect).mockResolvedValueOnce([]).mockResolvedValueOnce([{ value: "tray" }]);
  await expect(loadWindowCloseBehavior()).resolves.toBe("exit");
  await expect(loadWindowCloseBehavior()).resolves.toBe("tray");
});

it("updates the native close behavior only after SQLite saves the selection", async () => {
  vi.mocked(dbExecute).mockRejectedValueOnce(new Error("disk error")).mockResolvedValueOnce(undefined);
  await expect(saveWindowCloseBehavior("tray")).rejects.toThrow("disk error");
  expect(invoke).not.toHaveBeenCalled();
  await saveWindowCloseBehavior("tray");
  expect(invoke).toHaveBeenCalledWith("set_main_window_close_behavior", { hideToTray: true });
});
