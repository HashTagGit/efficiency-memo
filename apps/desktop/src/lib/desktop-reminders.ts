import { invoke, isTauri } from "@tauri-apps/api/core";
import { isPermissionGranted, sendNotification } from "@tauri-apps/plugin-notification";
import { dbExecute, dbSelect } from "./db";

export interface DesktopReminder {
  kind: "break" | "hydration" | "check-in" | "daily-review" | "weekly-review" | "preview";
  title: string;
  body: string;
}

export function supportsDesktopPet(): boolean {
  return isTauri() && /\bWindows\b/.test(navigator.userAgent);
}

export async function desktopPetEnabled(): Promise<boolean> {
  if (!supportsDesktopPet()) return false;
  const [preference] = await dbSelect<{ pet_enabled: number }>(
    "SELECT pet_enabled FROM desktop_reminder_preferences WHERE id = 1",
  );
  return preference?.pet_enabled !== 0;
}

export async function saveDesktopPetEnabled(enabled: boolean): Promise<void> {
  await dbExecute(
    "INSERT INTO desktop_reminder_preferences (id, pet_enabled) VALUES (1, $1) ON CONFLICT(id) DO UPDATE SET pet_enabled = excluded.pet_enabled",
    [Number(enabled)],
  );
}

export interface DesktopPetPosition { x: number; y: number }
export interface DesktopPetBehaviorPreferences { lookEnabled: boolean; walkEnabled: boolean; miniEnabled: boolean }
export type DesktopPetFocus = "idle" | "working" | "paused" | "waiting";

type BehaviorRow = { look_enabled: number; walk_enabled: number; mini_enabled: number };

function behaviorPreferences(row?: BehaviorRow): DesktopPetBehaviorPreferences {
  return { lookEnabled: row?.look_enabled === 1, walkEnabled: row?.walk_enabled === 1, miniEnabled: row?.mini_enabled === 1 };
}

export async function loadDesktopPetBehavior(): Promise<DesktopPetBehaviorPreferences> {
  const [row] = await dbSelect<BehaviorRow>(
    "SELECT look_enabled, walk_enabled, mini_enabled FROM desktop_reminder_preferences WHERE id = 1",
  );
  return behaviorPreferences(row);
}

export async function saveDesktopPetBehavior(preferences: DesktopPetBehaviorPreferences): Promise<void> {
  await dbExecute(
    "INSERT INTO desktop_reminder_preferences (id, pet_enabled, look_enabled, walk_enabled, mini_enabled) VALUES (1, 1, $1, $2, $3) ON CONFLICT(id) DO UPDATE SET look_enabled = excluded.look_enabled, walk_enabled = excluded.walk_enabled, mini_enabled = excluded.mini_enabled",
    [Number(preferences.lookEnabled), Number(preferences.walkEnabled), Number(preferences.miniEnabled)],
  );
  await invoke("set_desktop_pet_behavior", { preferences });
}

export async function setDesktopPetEnabled(enabled: boolean, recover?: boolean): Promise<void> {
  const [row] = enabled ? await dbSelect<BehaviorRow & { pet_x: number | null; pet_y: number | null }>(
    "SELECT pet_x, pet_y, look_enabled, walk_enabled, mini_enabled FROM desktop_reminder_preferences WHERE id = 1",
  ) : [];
  const position = row?.pet_x != null && row.pet_y != null ? { x: row.pet_x, y: row.pet_y } : null;
  await invoke("set_desktop_pet_enabled", { enabled, position, preferences: behaviorPreferences(row), recover });
}

export async function saveDesktopPetPosition(position: DesktopPetPosition | null): Promise<void> {
  await dbExecute(
    "INSERT INTO desktop_reminder_preferences (id, pet_enabled, pet_x, pet_y) VALUES (1, 1, $1, $2) ON CONFLICT(id) DO UPDATE SET pet_x = excluded.pet_x, pet_y = excluded.pet_y",
    [position?.x ?? null, position?.y ?? null],
  );
}

export function showDesktopPetReminder(input: DesktopReminder, deliveryKey?: string): Promise<boolean> {
  return invoke("show_desktop_pet_reminder", deliveryKey ? { input, deliveryKey } : { input });
}

export async function canDeliverDesktopReminder(): Promise<boolean> {
  if (await desktopPetEnabled().catch(() => false)) return true;
  return isPermissionGranted().catch(() => false);
}

export async function deliverDesktopReminder(reminder: DesktopReminder, deliveryKey?: string): Promise<boolean> {
  try {
    if (await desktopPetEnabled()) {
      const shown = await showDesktopPetReminder(reminder, deliveryKey);
      return deliveryKey ? shown : true;
    }
  } catch (error) {
    console.warn("Desktop pet reminder could not be shown.", error);
  }
  try {
    if (await isPermissionGranted()) {
      sendNotification({ title: reminder.title, body: reminder.body });
      return true;
    }
  } catch {
    // The owning tool retains its pending reminder state.
  }
  return false;
}
