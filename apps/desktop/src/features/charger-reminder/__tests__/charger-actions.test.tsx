// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../../lib/i18n";
import { chargerReminderDb } from "../db-tauri";
import ChargerReminderRoutes from "../pages/charger-reminder-routes";
import { loadChargerNotificationState } from "../charger-notifications";
import type { DeviceWithChargeHistory } from "../contracts";

const item: DeviceWithChargeHistory = {
  device: {
    id: "device-1", user_id: "local-user", name: "Travel mouse", device_type: "wireless-mouse",
    capacity_mah: null, notes: null, threshold_percent: 25,
    created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z",
  },
  preset: {
    id: "preset-1", type: "wireless-mouse", default_threshold: 25,
    estimated_drain_per_month: 8.5, label: "Wireless Mouse",
    created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z",
  },
  reminder_preference: null,
  computed_reminder_state: {
    id: "state-1", device_id: "device-1", heuristic_version: "deterministic-v1",
    estimated_battery_percent: 20, estimated_days_until_threshold: 0,
    reminder_due_at: "2020-01-01T08:00:00.000Z", status: "charge-now", basis: "basis",
    last_charge_event_id: null, computed_at: "2026-08-28T08:00:00.000Z",
    created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-28T08:00:00.000Z",
  },
  charge_events: [],
};

vi.mock("../db-tauri", () => ({
  chargerReminderDb: {
    getDeviceById: vi.fn(),
    logChargeEvent: vi.fn(),
  },
}));
vi.mock("../charger-notifications", () => ({
  isChargerReminderDue: vi.fn().mockReturnValue(true),
  loadChargerNotificationState: vi.fn(),
  snoozeChargerNotification: vi.fn(),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Charger Reminder actions", () => {
  it("records a full charge through the existing device persistence path", async () => {
    vi.mocked(chargerReminderDb.getDeviceById).mockResolvedValue(item);
    vi.mocked(chargerReminderDb.logChargeEvent).mockResolvedValue({
      id: "charge-1", device_id: "device-1", charged_at: "2026-08-28T08:00:00.000Z",
      notes: null, created_at: "2026-08-28T08:00:00.000Z",
    });
    vi.mocked(loadChargerNotificationState).mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/device-1"]}>
        <I18nProvider initialLocale="en-US"><ChargerReminderRoutes /></I18nProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Record full charge" }));
    await waitFor(() => expect(chargerReminderDb.logChargeEvent).toHaveBeenCalledWith({
      device_id: "device-1",
      charged_at: expect.any(String),
    }));
    expect(await screen.findByText("The full charge was recorded and the estimate was refreshed.")).toBeTruthy();
  });
});
