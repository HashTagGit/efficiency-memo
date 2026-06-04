import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeviceCard } from "../device-card";
import type { DeviceWithChargeHistory } from "@/features/charger-reminder/database/contracts";

const mockDevice: DeviceWithChargeHistory = {
  device: {
    id: "device-1",
    user_id: "user-1",
    name: "Logitech MX Master 3",
    device_type: "wireless-mouse",
    capacity_mah: 500,
    notes: "Main work mouse",
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
  reminder_preference: {
    id: "pref-1",
    device_id: "device-1",
    notify_before_days: 3,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  computed_reminder_state: {
    id: "state-1",
    device_id: "device-1",
    heuristic_version: "1.0",
    estimated_battery_percent: 67.5,
    estimated_days_until_threshold: 5,
    reminder_due_at: null,
    status: "tracking",
    basis: "heuristic-v1",
    last_charge_event_id: "event-1",
    computed_at: "2025-01-01T00:00:00Z",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  charge_events: [],
};

describe("DeviceCard", () => {
  it("renders device name in title", () => {
    render(<DeviceCard item={mockDevice} />);
    expect(screen.getByText("Logitech MX Master 3")).toBeInTheDocument();
  });

  it("renders battery capacity in description", () => {
    render(<DeviceCard item={mockDevice} />);
    expect(screen.getByText(/500\s*mAh/i)).toBeInTheDocument();
  });

  it("renders charge level as percentage in description", () => {
    render(<DeviceCard item={mockDevice} />);
    expect(screen.getByText(/67\.5%/)).toBeInTheDocument();
  });

  it("renders last-charged date from charge history", () => {
    const deviceWithCharge = {
      ...mockDevice,
      charge_events: [
        {
          id: "event-1",
          device_id: "device-1",
          charged_at: "2025-01-15T10:00:00Z",
          notes: null,
          created_at: "2025-01-15T10:00:00Z",
        },
      ],
    };
    render(<DeviceCard item={deviceWithCharge} />);
    expect(screen.getByText(/last charged/i)).toBeInTheDocument();
  });

  it("renders preset label in description", () => {
    render(<DeviceCard item={mockDevice} />);
    expect(screen.getByText(/wireless mouse/i)).toBeInTheDocument();
  });

  it("renders status in description when computed_reminder_state exists", () => {
    render(<DeviceCard item={mockDevice} />);
    expect(screen.getByText(/tracking/i)).toBeInTheDocument();
  });

  it("uses @memo/ui Card component", () => {
    const { container } = render(<DeviceCard item={mockDevice} />);
    const cardElement = container.querySelector('[class*="rounded-2xl"]');
    expect(cardElement).toBeInTheDocument();
  });

  it("renders with data-testid containing device id", () => {
    render(<DeviceCard item={mockDevice} />);
    expect(screen.getByTestId("device-card-device-1")).toBeInTheDocument();
  });
});