import {
  isPermissionGranted,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function chargerNotificationsGranted(): Promise<boolean> {
  try {
    return await isPermissionGranted();
  } catch {
    return false;
  }
}

export async function notifyCharger(title: string, body: string): Promise<boolean> {
  try {
    if (await isPermissionGranted()) {
      sendNotification({ title, body });
      return true;
    }
  } catch {
    // The due device remains visible in Now and Charger Reminder.
  }
  return false;
}
