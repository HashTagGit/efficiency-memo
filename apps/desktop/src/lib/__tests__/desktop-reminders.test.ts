// @vitest-environment jsdom

import { invoke, isTauri } from "@tauri-apps/api/core";
import { isPermissionGranted, sendNotification } from "@tauri-apps/plugin-notification";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dbSelect } from "../db";
import { canDeliverDesktopReminder, deliverDesktopReminder, type DesktopReminder } from "../desktop-reminders";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(), isTauri: vi.fn() }));
vi.mock("@tauri-apps/plugin-notification", () => ({ isPermissionGranted: vi.fn(), sendNotification: vi.fn() }));
vi.mock("../db", () => ({ dbSelect: vi.fn() }));

const reminder: DesktopReminder = { kind: "hydration", title: "Water", body: "Take a drink." };

beforeEach(() => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Windows NT 10.0)");
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(isPermissionGranted).mockResolvedValue(false);
  vi.mocked(dbSelect).mockResolvedValue([]);
  vi.mocked(invoke).mockResolvedValue(undefined);
});

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("desktop reminder delivery", () => {
  it("uses the pet for existing Windows profiles even without native notification permission", async () => {
    expect(await canDeliverDesktopReminder()).toBe(true);
    expect(await deliverDesktopReminder(reminder)).toBe(true);
    expect(invoke).toHaveBeenCalledWith("show_desktop_pet_reminder", { input: reminder });
    expect(isPermissionGranted).not.toHaveBeenCalled();
  });

  it("uses the system notification when the pet is disabled", async () => {
    vi.mocked(dbSelect).mockResolvedValue([{ pet_enabled: 0 }]);
    vi.mocked(isPermissionGranted).mockResolvedValue(true);
    expect(await deliverDesktopReminder(reminder)).toBe(true);
    expect(invoke).not.toHaveBeenCalled();
    expect(sendNotification).toHaveBeenCalledWith({ title: reminder.title, body: reminder.body });
  });

  it("falls back to the system notification when the pet window fails", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("Window unavailable"));
    vi.mocked(isPermissionGranted).mockResolvedValue(true);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await deliverDesktopReminder(reminder)).toBe(true);
    expect(sendNotification).toHaveBeenCalledOnce();
  });
});
