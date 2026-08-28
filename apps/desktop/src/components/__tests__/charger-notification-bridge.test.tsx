// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../lib/i18n";
import { ChargerNotificationBridge } from "../charger-notification-bridge";
import {
  acknowledgeChargerNotification,
  claimDueChargerNotifications,
} from "../../features/charger-reminder/charger-notifications";
import { notifyCharger } from "../../features/charger-reminder/notifications";
import { readSystemInterruptionState } from "../../lib/system-interruption";

vi.mock("../../lib/auth", () => ({ getCurrentUser: () => ({ id: "local-user" }) }));
vi.mock("../../lib/system-interruption", () => ({
  readSystemInterruptionState: vi.fn().mockResolvedValue({ notificationsAllowed: true, reason: "available" }),
}));
vi.mock("../../features/charger-reminder/charger-notifications", () => ({
  acknowledgeChargerNotification: vi.fn().mockResolvedValue(undefined),
  claimDueChargerNotifications: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../features/charger-reminder/notifications", () => ({
  chargerNotificationsGranted: vi.fn().mockResolvedValue(true),
  notifyCharger: vi.fn().mockResolvedValue(false),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Charger notification bridge", () => {
  it("leaves due states unclaimed while supported system DND blocks notifications", async () => {
    vi.mocked(readSystemInterruptionState)
      .mockResolvedValueOnce({ notificationsAllowed: false, reason: "busy" });

    render(<I18nProvider initialLocale="en-US"><ChargerNotificationBridge /></I18nProvider>);

    await waitFor(() => expect(readSystemInterruptionState).toHaveBeenCalledTimes(1));
    expect(claimDueChargerNotifications).not.toHaveBeenCalled();
  });

  it("acknowledges a due state only after the native notification succeeds", async () => {
    vi.mocked(claimDueChargerNotifications).mockResolvedValueOnce([{
      deviceId: "device-1",
      name: "Travel mouse",
      dueAt: "2030-01-01T08:00:00.000Z",
    }]);
    vi.mocked(notifyCharger).mockResolvedValueOnce(true);

    render(<I18nProvider initialLocale="en-US"><ChargerNotificationBridge /></I18nProvider>);

    await waitFor(() => expect(acknowledgeChargerNotification)
      .toHaveBeenCalledWith("device-1", "2030-01-01T08:00:00.000Z"));
    expect(vi.mocked(notifyCharger).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(acknowledgeChargerNotification).mock.invocationCallOrder[0]);
  });

  it("keeps the due state unacknowledged when the native notification fails", async () => {
    vi.mocked(claimDueChargerNotifications).mockResolvedValueOnce([{
      deviceId: "device-1",
      name: "Travel mouse",
      dueAt: "2030-01-01T08:00:00.000Z",
    }]);

    render(<I18nProvider initialLocale="en-US"><ChargerNotificationBridge /></I18nProvider>);

    await waitFor(() => expect(notifyCharger).toHaveBeenCalledTimes(1));
    expect(acknowledgeChargerNotification).not.toHaveBeenCalled();
  });
});
