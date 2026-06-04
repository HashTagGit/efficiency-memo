import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeviceForm } from "../device-form";
import type { DeviceRecord, DevicePresetType } from "@/features/charger-reminder/database/contracts";

const mockPresets = [
  {
    type: "wireless-mouse" as DevicePresetType,
    label: "Wireless Mouse",
    default_threshold: 25,
  },
  {
    type: "game-controller" as DevicePresetType,
    label: "Game Controller",
    default_threshold: 20,
  },
];

const mockDevice: DeviceRecord = {
  id: "device-1",
  user_id: "user-1",
  name: "Logitech MX Master 3",
  device_type: "wireless-mouse",
  capacity_mah: 500,
  notes: "Main work mouse",
  threshold_percent: 25,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

describe("DeviceForm", () => {
  describe("create mode", () => {
    it("renders form fields for create mode", () => {
      render(<DeviceForm presets={mockPresets} mode="create" />);

      expect(screen.getByLabelText(/device name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/capacity.*mAh/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/threshold/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reminder enabled/i)).toBeInTheDocument();
    });

    it("renders submit button with correct label for create mode", () => {
      render(<DeviceForm presets={mockPresets} mode="create" />);
      expect(screen.getByRole("button", { name: /add device/i })).toBeInTheDocument();
    });

    it("renders all preset options in device type dropdown", () => {
      render(<DeviceForm presets={mockPresets} mode="create" />);

      expect(screen.getByRole("option", { name: /wireless mouse/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /game controller/i })).toBeInTheDocument();
    });

    it("sets default threshold from first preset", () => {
      render(<DeviceForm presets={mockPresets} mode="create" />);
      expect(screen.getByText("Threshold (25%)")).toBeInTheDocument();
    });
  });

  describe("edit mode", () => {
    it("renders form pre-filled with device data", () => {
      render(<DeviceForm presets={mockPresets} device={mockDevice} mode="edit" />);

      expect(screen.getByDisplayValue("Logitech MX Master 3")).toBeInTheDocument();
      expect(screen.getByDisplayValue("500")).toBeInTheDocument();
    });

    it("renders submit button with correct label for edit mode", () => {
      render(<DeviceForm presets={mockPresets} device={mockDevice} mode="edit" />);
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });

    it("renders cancel button in edit mode", () => {
      render(<DeviceForm presets={mockPresets} device={mockDevice} mode="edit" />);
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows error when name is empty", () => {
      render(<DeviceForm presets={mockPresets} mode="create" />);

      const form = screen.getByTestId("device-form");
      fireEvent.submit(form.querySelector("form")!);

      expect(screen.getByText("Device name is required")).toBeInTheDocument();
    });

    it("shows error when capacity is not a positive number", () => {
      render(<DeviceForm presets={mockPresets} mode="create" />);

      fireEvent.change(screen.getByLabelText("Device Name *"), { target: { value: "Test Device" } });
      fireEvent.change(screen.getByPlaceholderText("e.g., 2400"), { target: { value: "-100" } });

      const form = screen.getByTestId("device-form");
      fireEvent.submit(form.querySelector("form")!);

      expect(screen.getByText("Capacity must be a positive number")).toBeInTheDocument();
    });

    it("accepts valid threshold values", () => {
      render(<DeviceForm presets={mockPresets} mode="create" />);

      fireEvent.change(screen.getByLabelText("Device Name *"), { target: { value: "Test Device" } });

      // Threshold is a range input, valid values are 0-100
      // Test that 50% is accepted (no error)
      const thresholdInput = screen.getByLabelText("Threshold (25%)") as HTMLInputElement;
      fireEvent.change(thresholdInput, { target: { value: "50" } });

      const form = screen.getByTestId("device-form");
      fireEvent.submit(form.querySelector("form")!);

      // No validation error should appear for valid threshold
      expect(screen.queryByText(/threshold must be between/i)).not.toBeInTheDocument();
    });

    it("shows error when capacity is zero", () => {
      render(<DeviceForm presets={mockPresets} mode="create" />);

      fireEvent.change(screen.getByLabelText("Device Name *"), { target: { value: "Test Device" } });
      fireEvent.change(screen.getByPlaceholderText("e.g., 2400"), { target: { value: "0" } });

      const form = screen.getByTestId("device-form");
      fireEvent.submit(form.querySelector("form")!);

      expect(screen.getByText("Capacity must be a positive number")).toBeInTheDocument();
    });
  });

  describe("reminder_enabled field", () => {
    it("renders reminder enabled toggle", () => {
      render(<DeviceForm presets={mockPresets} mode="create" />);
      expect(screen.getByLabelText(/reminder enabled/i)).toBeInTheDocument();
    });

    it("toggles reminder enabled state", () => {
      render(<DeviceForm presets={mockPresets} mode="create" />);

      const toggle = screen.getByLabelText(/reminder enabled/i) as HTMLInputElement;
      expect(toggle.checked).toBe(true);

      fireEvent.click(toggle);
      expect(toggle.checked).toBe(false);

      fireEvent.click(toggle);
      expect(toggle.checked).toBe(true);
    });
  });

  describe("form submission", () => {
    it("calls onSubmit with form data on valid submission", () => {
      const onSubmit = vi.fn();

      render(
        <DeviceForm
          presets={mockPresets}
          mode="create"
          onSubmit={onSubmit}
        />
      );

      fireEvent.change(screen.getByLabelText(/device name/i), { target: { value: "Test Device" } });
      fireEvent.change(screen.getByLabelText(/capacity.*mAh/i), { target: { value: "1000" } });
      fireEvent.click(screen.getByRole("button", { name: /add device/i }));

      expect(onSubmit).toHaveBeenCalled();
      const submittedData = onSubmit.mock.calls[0][0];
      expect(submittedData.name).toBe("Test Device");
      expect(submittedData.capacity_mah).toBe(1000);
    });
  });
});
