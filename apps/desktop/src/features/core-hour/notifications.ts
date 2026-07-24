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

export async function notifyCheckIn(): Promise<void> {
  try {
    if (await isPermissionGranted()) {
      sendNotification({
        title: "CoreHour check-in",
        body: "What did you spend the last interval doing?",
      });
    }
  } catch {
    // The in-app check-in remains available when notifications are unavailable.
  }
}
