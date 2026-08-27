import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function requestReminderNotifications(): Promise<void> {
  try {
    if (!(await isPermissionGranted())) await requestPermission();
  } catch {
    // In-app reminder actions remain available when permission is denied.
  }
}

export async function sendReminderNotification(title: string, body: string): Promise<void> {
  try {
    if (await isPermissionGranted()) sendNotification({ title, body });
  } catch {
    // Pending state remains visible inside the app.
  }
}
