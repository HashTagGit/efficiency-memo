import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeviceList } from "../device-list";
import type { DeviceWithChargeHistory } from "@/features/charger-reminder/database/contracts";

const createMockDevice = (id: string, name: string): DeviceWithChargeHistory => ({
  device: {
    id,
    user_id: "user-1",
    name,
    device_type: "wireless-mouse",
    capacity_mah: 500,
    notes: null,
    threshold_percent: 25,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  preset: {
    id: "preset-1",
    type: "wireless-mouse",
    label: "Wireless Mouse",
    default_threshold: 25,
    estimated_drain_per_month: 10,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  reminder_preference: null,
  computed_reminder_state: {
    id: `state-${id}`,
    device_id: id,
    heuristic_version: "1.0",
    estimated_battery_percent: 75,
    estimated_days_until_threshold: 10,
    reminder_due_at: null,
    status: "tracking",
    basis: "heuristic-v1",
    last_charge_event_id: null,
    computed_at: "2025-01-01T00:00:00Z",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  charge_events: [],
});

describe("DeviceList", () => {
  it("renders list of DeviceCards from devices array prop", () => {
    const devices = [
      createMockDevice("device-1", "Logitech MX Master"),
      createMockDevice("device-2", "Apple Magic Mouse"),
    ];
    render(<DeviceList devices={devices} />);
    expect(screen.getByText("Logitech MX Master")).toBeInTheDocument();
    expect(screen.getByText("Apple Magic Mouse")).toBeInTheDocument();
  });

  it("renders DeviceCard for each device in the array", () => {
    const devices = [
      createMockDevice("device-1", "Device One"),
      createMockDevice("device-2", "Device Two"),
      createMockDevice("device-3", "Device Three"),
    ];
    render(<DeviceList devices={devices} />);
    expect(screen.getByText("Device One")).toBeInTheDocument();
    expect(screen.getByText("Device Two")).toBeInTheDocument();
    expect(screen.getByText("Device Three")).toBeInTheDocument();
  });

  it("renders empty state when devices array is empty", () => {
    render(<DeviceList devices={[]} />);
    expect(screen.getByText(/no devices/i)).toBeInTheDocument();
  });

  it("renders correct number of devices", () => {
    const devices = [
      createMockDevice("device-1", "Device One"),
      createMockDevice("device-2", "Device Two"),
    ];
    render(<DeviceList devices={devices} />);
    const deviceCards = screen.getAllByText(/Device One|Device Two/);
    expect(deviceCards.length).toBeGreaterThanOrEqual(2);
  });
});