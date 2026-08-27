import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function requestCheckInNotifications(): Promise<void> {
  try {
    if (!(await isPermissionGranted())) await requestPermission();
  } catch {
    // A denied platform permission must not block local time tracking.
  }
}

export async function notifyCheckIn(title: string, body: string): Promise<void> {
  try {
    if (await isPermissionGranted()) {
      sendNotification({ title, body });
    }
  } catch {
    // The in-app check-in remains available when notifications are unavailable.
  }
}
