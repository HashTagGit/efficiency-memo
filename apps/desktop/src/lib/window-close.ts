import { invoke, isTauri } from "@tauri-apps/api/core";
import { dbExecute, dbSelect } from "./db";

export type WindowCloseBehavior = "exit" | "tray";

export function supportsWindowCloseBehavior(): boolean {
  return isTauri() && /\bWindows\b/.test(navigator.userAgent);
}

export async function loadWindowCloseBehavior(): Promise<WindowCloseBehavior> {
  const [setting] = await dbSelect<{ value: string }>(
    "SELECT value FROM ch_settings WHERE key = 'desktop.close_behavior'",
  );
  return setting?.value === "tray" ? "tray" : "exit";
}

export function applyWindowCloseBehavior(behavior: WindowCloseBehavior): Promise<void> {
  return invoke("set_main_window_close_behavior", { hideToTray: behavior === "tray" });
}

export async function saveWindowCloseBehavior(behavior: WindowCloseBehavior): Promise<void> {
  await dbExecute(
    "INSERT OR REPLACE INTO ch_settings (key, value) VALUES ('desktop.close_behavior', $1)",
    [behavior],
  );
  await applyWindowCloseBehavior(behavior);
}
