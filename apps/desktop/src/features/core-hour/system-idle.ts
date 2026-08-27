import { invoke } from "@tauri-apps/api/core";

export async function readSystemIdleSeconds(): Promise<number | null> {
  try {
    const seconds = await invoke<number | null>("get_system_idle_seconds");
    return seconds === null ? null : Number(seconds);
  } catch {
    return null;
  }
}
