import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { deliverDesktopReminder } from "../../lib/desktop-reminders";

export async function requestCoreHourNotifications(): Promise<void> {
  try {
    if (!(await isPermissionGranted())) await requestPermission();
  } catch {
    // A denied platform permission must not block local time tracking.
  }
}

export function notifyCheckIn(title: string, body: string): Promise<boolean> {
  return deliverDesktopReminder({ kind: "check-in", title, body });
}

export const requestCheckInNotifications = requestCoreHourNotifications;
