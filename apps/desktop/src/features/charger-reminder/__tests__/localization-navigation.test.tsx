// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "../../../lib/i18n";
import { DeviceCard } from "../components/device-card";
import { DeviceDetail } from "../components/device-detail";
import { DeviceForm } from "../components/device-form";
import type { DeviceWithChargeHistory } from "../contracts";

const item: DeviceWithChargeHistory = {
  device: {
    id: "device-1",
    user_id: "local-user",
    name: "Office Mouse",
    device_type: "wireless-mouse",
    capacity_mah: 2400,
    notes: "Desk",
    threshold_percent: 25,
    created_at: "2026-08-01T08:00:00.000Z",
    updated_at: "2026-08-01T08:00:00.000Z",
  },
  preset: {
    id: "preset-1",
    type: "wireless-mouse",
    default_threshold: 25,
    estimated_drain_per_month: 8.5,
    label: "Wireless Mouse",
    created_at: "2026-08-01T08:00:00.000Z",
    updated_at: "2026-08-01T08:00:00.000Z",
  },
  reminder_preference: {
    id: "preference-1",
    device_id: "device-1",
    notify_before_days: 2,
    created_at: "2026-08-01T08:00:00.000Z",
    updated_at: "2026-08-01T08:00:00.000Z",
  },
  computed_reminder_state: {
    id: "state-1",
    device_id: "device-1",
    heuristic_version: "deterministic-v1",
    estimated_battery_percent: 20,
    estimated_days_until_threshold: 1,
    reminder_due_at: "2026-08-30T08:00:00.000Z",
    status: "charge-now",
    basis: "Internal English heuristic explanation",
    last_charge_event_id: "charge-1",
    computed_at: "2026-08-28T08:00:00.000Z",
    created_at: "2026-08-01T08:00:00.000Z",
    updated_at: "2026-08-28T08:00:00.000Z",
  },
  charge_events: [{
    id: "charge-1",
    device_id: "device-1",
    charged_at: "2026-08-01T08:00:00.000Z",
    notes: null,
    created_at: "2026-08-01T08:00:00.000Z",
  }],
};

afterEach(cleanup);

describe("Charger Reminder localization and navigation", () => {
  it("renders form and detail content in Chinese without raw heuristic text", () => {
    render(
      <I18nProvider initialLocale="zh-CN">
        <DeviceForm
          mode="create"
          presets={[{ type: "wireless-mouse", label: "Wireless Mouse", default_threshold: 25 }]}
        />
        <DeviceDetail item={item} />
      </I18nProvider>,
    );

    expect(screen.getAllByText("添加设备")).toHaveLength(2);
    expect(screen.getByText("设备名称 *")).toBeTruthy();
    expect(screen.getAllByText("无线鼠标").length).toBeGreaterThan(0);
    expect(screen.getByText("提醒状态")).toBeTruthy();
    expect(screen.getByText("现在充电")).toBeTruthy();
    expect(screen.queryByText("Internal English heuristic explanation")).toBeNull();
  });

  it("opens a device detail route from its card", () => {
    render(
      <MemoryRouter initialEntries={["/tools/charger-reminder"]}>
        <I18nProvider initialLocale="zh-CN">
          <Routes>
            <Route path="/tools/charger-reminder" element={<DeviceCard item={item} />} />
            <Route path="/tools/charger-reminder/:id" element={<p>detail route</p>} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>,
    );

    const card = screen.getByTestId("device-card-device-1");
    expect(card.textContent).toContain("状态：现在充电");
    fireEvent.click(card);
    expect(screen.getByText("detail route")).toBeTruthy();
  });
});
