import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function requestCoreHourNotifications(): Promise<void> {
  try {
    if (!(await isPermissionGranted())) await requestPermission();
  } catch {
    // A denied platform permission must not block local time tracking.
  }
}

export async function coreHourNotificationsGranted(): Promise<boolean> {
  try {
    return await isPermissionGranted();
  } catch {
    return false;
  }
}

export async function notifyCoreHour(title: string, body: string): Promise<boolean> {
  try {
    if (await isPermissionGranted()) {
      sendNotification({ title, body });
      return true;
    }
  } catch {
    // The in-app check-in remains available when notifications are unavailable.
  }
  return false;
}

export const notifyCheckIn = notifyCoreHour;
export const requestCheckInNotifications = requestCoreHourNotifications;
