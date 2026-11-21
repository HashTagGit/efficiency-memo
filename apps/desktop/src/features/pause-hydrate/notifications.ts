import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { deliverDesktopReminder } from "../../lib/desktop-reminders";
import type { ReminderKind, ReminderNotificationPermission } from "./types";

export async function reminderNotificationPermission(): Promise<ReminderNotificationPermission> {
  try {
    if (await isPermissionGranted()) return "granted";
    return typeof Notification === "undefined" ? "unknown" : Notification.permission;
  } catch {
    return "unsupported";
  }
}

export async function requestReminderNotifications(): Promise<ReminderNotificationPermission> {
  try {
    if (await isPermissionGranted()) return "granted";
    return await requestPermission();
  } catch {
    // In-app reminder actions remain available when native notifications are unavailable.
    return "unsupported";
  }
}

export async function sendReminderNotification(kind: ReminderKind, title: string, body: string): Promise<void> {
  await deliverDesktopReminder({ kind, title, body });
}
