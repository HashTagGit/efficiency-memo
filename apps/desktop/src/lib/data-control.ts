import { invoke } from "@tauri-apps/api/core";
import { LOCALE_KEY, type Locale } from "./i18n";
import {
  PALETTE_KEY,
  THEME_MODE_KEY,
  type Palette,
  type ThemeMode,
} from "./appearance";

export interface PortablePreferences {
  locale: Locale;
  themeMode: ThemeMode;
  palette: Palette;
}

export interface DataCounts {
  profiles: number;
  coreHourSessions: number;
  coreHourPlans: number;
  coreHourTags: number;
  pauseHydrateEvents: number;
}

export interface BackupPreview {
  packageVersion: number;
  schemaVersion: number;
  createdAt: string;
  preferences: PortablePreferences;
  counts: DataCounts;
}

export type ResetScope = "core-hour" | "pause-hydrate" | "all";

export function applyPortablePreferences(
  preferences: PortablePreferences,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): void {
  storage.setItem(LOCALE_KEY, preferences.locale);
  storage.setItem(THEME_MODE_KEY, preferences.themeMode);
  storage.setItem(PALETTE_KEY, preferences.palette);
}

export function currentDataSummary(): Promise<DataCounts> {
  return invoke("current_data_summary");
}

export function createLocalBackup(
  path: string,
  preferences: PortablePreferences,
): Promise<BackupPreview> {
  return invoke("create_local_backup", { path, preferences });
}

export function previewLocalBackup(path: string): Promise<BackupPreview> {
  return invoke("preview_local_backup", { path });
}

export function prepareLocalRestore(path: string): Promise<BackupPreview> {
  return invoke("prepare_local_restore", { path });
}

export function resetLocalData(scope: ResetScope, userId: string): Promise<DataCounts> {
  return invoke("reset_local_data", { scope, userId });
}

export function takeAppliedRestorePreferences(): Promise<PortablePreferences | null> {
  return invoke("take_applied_restore_preferences");
}
