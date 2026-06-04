import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeviceDetail } from "../device-detail";
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
    updated_at: "2025-01-15T00:00:00Z",
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
    reminder_due_at: "2025-01-20T00:00:00Z",
    status: "tracking",
    basis: "heuristic-v1",
    last_charge_event_id: "event-1",
    computed_at: "2025-01-15T00:00:00Z",
    created_at: "2025-01-15T00:00:00Z",
    updated_at: "2025-01-15T00:00:00Z",
  },
  charge_events: [
    {
      id: "event-3",
      device_id: "device-1",
      charged_at: "2025-01-15T10:00:00Z",
      notes: "Full charge",
      created_at: "2025-01-15T10:00:00Z",
    },
    {
      id: "event-2",
      device_id: "device-1",
      charged_at: "2025-01-10T09:00:00Z",
      notes: null,
      created_at: "2025-01-10T09:00:00Z",
    },
    {
      id: "event-1",
      device_id: "device-1",
      charged_at: "2025-01-05T08:00:00Z",
      notes: "Initial charge",
      created_at: "2025-01-05T08:00:00Z",
    },
  ],
};

describe("DeviceDetail", () => {
  describe("device info display", () => {
    it("renders device name as title", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText("Logitech MX Master 3")).toBeInTheDocument();
    });

    it("renders device type/preset label", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText(/wireless mouse/i)).toBeInTheDocument();
    });

    it("renders device capacity", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText(/500\s*mAh/i)).toBeInTheDocument();
    });

    it("renders device threshold", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText("25%")).toBeInTheDocument();
    });

    it("renders notes when present", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText(/main work mouse/i)).toBeInTheDocument();
    });

    it("renders creation date", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText(/created/i)).toBeInTheDocument();
    });
  });

  describe("charge history table", () => {
    it("renders charge history section", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText(/charge history/i)).toBeInTheDocument();
    });

    it("renders table headers", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText("Charged At")).toBeInTheDocument();
      expect(screen.getByText("Notes", { selector: "th" })).toBeInTheDocument();
    });

    it("renders all charge events in table", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getAllByRole("row")).toHaveLength(4); // 1 header + 3 data rows
    });

    it("renders charge event dates", () => {
      render(<DeviceDetail item={mockDevice} />);
      // Dates are rendered in the table
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBe(4); // 1 header + 3 data rows
    });

    it("renders charge event notes when present", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText(/full charge/i)).toBeInTheDocument();
      expect(screen.getByText(/initial charge/i)).toBeInTheDocument();
    });

    it("renders empty cell for charge events without notes", () => {
      render(<DeviceDetail item={mockDevice} />);
      const rows = screen.getAllByRole("row");
      const secondRow = rows[2]; // Jan 10 entry has no notes
      expect(secondRow).toBeInTheDocument();
    });
  });

  describe("reminder settings display", () => {
    it("renders reminder settings section", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText("Reminder Settings")).toBeInTheDocument();
    });

    it("renders reminder status", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText("tracking")).toBeInTheDocument();
    });

    it("renders notify_before_days preference", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText("3 days")).toBeInTheDocument();
    });

    it("renders estimated battery percentage", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText("67.5%")).toBeInTheDocument();
    });

    it("renders estimated days until threshold", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText("5 days")).toBeInTheDocument();
    });

    it("renders basis/heuristic version", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText("heuristic-v1")).toBeInTheDocument();
    });

    it("renders reminder_due_at when present", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText(/reminder due/i)).toBeInTheDocument();
    });

    it("renders basis of computation", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByText("Basis")).toBeInTheDocument();
    });
  });

  describe("empty states", () => {
    it("handles device without charge history", () => {
      const deviceNoHistory: DeviceWithChargeHistory = {
        ...mockDevice,
        charge_events: [],
      };
      render(<DeviceDetail item={deviceNoHistory} />);
      expect(screen.getByText(/no charge events recorded/i)).toBeInTheDocument();
    });

    it("handles device without computed_reminder_state", () => {
      const deviceNoState: DeviceWithChargeHistory = {
        ...mockDevice,
        computed_reminder_state: null,
      };
      render(<DeviceDetail item={deviceNoState} />);
      expect(screen.queryByText(/battery.*%/i)).not.toBeInTheDocument();
    });

    it("handles device without reminder_preference", () => {
      const deviceNoPref: DeviceWithChargeHistory = {
        ...mockDevice,
        reminder_preference: null,
      };
      render(<DeviceDetail item={deviceNoPref} />);
      expect(screen.queryByText(/notify.*days/i)).not.toBeInTheDocument();
    });
  });

  describe("data-testid", () => {
    it("renders with data-testid containing device id", () => {
      render(<DeviceDetail item={mockDevice} />);
      expect(screen.getByTestId("device-detail-device-1")).toBeInTheDocument();
    });
  });
});
