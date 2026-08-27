import { invoke } from "@tauri-apps/api/core";

export type SystemInterruptionReason =
  | "available"
  | "not-present"
  | "busy"
  | "fullscreen"
  | "presentation"
  | "quiet-time"
  | "app"
  | "unsupported"
  | "unknown";

export interface SystemInterruptionState {
  notificationsAllowed: boolean;
  reason: SystemInterruptionReason;
}

export async function readSystemInterruptionState(): Promise<SystemInterruptionState | null> {
  try {
    return await invoke<SystemInterruptionState | null>("get_system_interruption_state");
  } catch {
    return null;
  }
}
