// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "../../../lib/i18n";
import { chargerReminderDb } from "../db-tauri";
import DeviceListPage from "../pages/device-list-page";

vi.mock("../../../lib/auth", () => ({
  getCurrentUser: () => ({ id: "local-user" }),
}));

vi.mock("../db-tauri", () => ({
  chargerReminderDb: {
    listDevicesByUser: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Charger Reminder list states", () => {
  it("offers a localized retry after loading fails", async () => {
    vi.mocked(chargerReminderDb.listDevicesByUser)
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <I18nProvider initialLocale="zh-CN">
          <DeviceListPage />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("无法加载设备")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    await waitFor(() => expect(chargerReminderDb.listDevicesByUser).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("尚未添加设备")).toBeTruthy();
  });
});
