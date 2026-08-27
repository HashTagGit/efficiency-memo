import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { ReminderNotificationPermission } from "./types";

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

export async function sendReminderNotification(title: string, body: string): Promise<void> {
  try {
    if (await isPermissionGranted()) sendNotification({ title, body });
  } catch {
    // Pending state remains visible inside the app.
  }
}
