import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { DeviceWithChargeHistory } from "@/features/charger-reminder/database/contracts";

// Mock next/navigation and next/link to avoid router context issues
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/tools/charger-reminder",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock server auth
vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: vi.fn().mockResolvedValue({ id: "user-1" }),
}));

// Use vi.hoisted to properly handle the mock functions - this keeps them in the correct scope
const { mockGetDeviceById, mockGetDevicePresets, mockUpdateDevice, mockCreateDevice } = vi.hoisted(() => ({
  mockGetDeviceById: vi.fn(),
  mockGetDevicePresets: vi.fn(),
  mockUpdateDevice: vi.fn(),
  mockCreateDevice: vi.fn(),
}));

// Mock database
vi.mock("@/features/charger-reminder/database/devices", () => ({
  listDevicesByUser: vi.fn(),
  getDeviceById: mockGetDeviceById,
  deleteDevice: vi.fn(),
  createDevice: mockCreateDevice,
  updateDevice: mockUpdateDevice,
  logChargeEvent: vi.fn(),
  setReminderPreference: vi.fn(),
  getDevicePresets: mockGetDevicePresets,
  getDefaultThresholdForPreset: vi.fn(),
  setComputedReminderState: vi.fn(),
  recomputeReminderStateForDevice: vi.fn(),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocks are set up
import NewDevicePage from "../new/page";
import EditDevicePage from "../[id]/edit/page";

const mockPresets = [
  {
    id: "preset-1",
    type: "wireless-mouse",
    label: "Wireless Mouse",
    icon: "mouse",
    default_threshold: 25,
  },
  {
    id: "preset-2",
    type: "game-controller",
    label: "Game Controller",
    icon: "gamepad",
    default_threshold: 30,
  },
  {
    id: "preset-3",
    type: "wireless-keyboard",
    label: "Wireless Keyboard",
    icon: "keyboard",
    default_threshold: 20,
  },
  {
    id: "preset-4",
    type: "bluetooth-headphones",
    label: "Bluetooth Headphones",
    icon: "headphones",
    default_threshold: 35,
  },
  {
    id: "preset-5",
    type: "power-bank",
    label: "Power Bank",
    icon: "battery-charging",
    default_threshold: 40,
  },
];

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
  ],
};

describe("NewDevicePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDevicePresets.mockResolvedValue(mockPresets);
  });

  it("renders DeviceForm with empty initial values", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await NewDevicePage();
    });
    render(jsx!);

    // The form should be present with empty name input
    const nameInput = screen.getByPlaceholderText("e.g., Xbox Controller Battery Pack");
    expect(nameInput).toBeInTheDocument();
    expect((nameInput as HTMLInputElement).value).toBe("");
  });

  it("renders page title and description", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await NewDevicePage();
    });
    render(jsx!);

    expect(screen.getByText("Add a new device")).toBeInTheDocument();
    expect(screen.getByText(/Track battery levels/)).toBeInTheDocument();
  });

  it("renders back link", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await NewDevicePage();
    });
    render(jsx!);

    expect(screen.getByText("← Back to Devices")).toBeInTheDocument();
  });

  it("renders DeviceForm in create mode", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await NewDevicePage();
    });
    render(jsx!);

    // Check that DeviceForm is rendered (it has data-testid="device-form")
    expect(screen.getByTestId("device-form")).toBeInTheDocument();
  });

  it("has Add Device button", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await NewDevicePage();
    });
    render(jsx!);

    expect(screen.getByRole("button", { name: /add device/i })).toBeInTheDocument();
  });
});

describe("EditDevicePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDevicePresets.mockResolvedValue(mockPresets);
  });

  it("renders DeviceForm pre-filled with device data", async () => {
    mockGetDeviceById.mockResolvedValue(mockDevice);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await EditDevicePage({ params: Promise.resolve({ id: "device-1" }) });
    });
    render(jsx!);

    // The form should have the device name pre-filled
    expect(screen.getByDisplayValue("Logitech MX Master 3")).toBeInTheDocument();
  });

  it("renders page title with device name", async () => {
    mockGetDeviceById.mockResolvedValue(mockDevice);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await EditDevicePage({ params: Promise.resolve({ id: "device-1" }) });
    });
    render(jsx!);

    expect(screen.getByText("Logitech MX Master 3")).toBeInTheDocument();
  });

  it("renders back link", async () => {
    mockGetDeviceById.mockResolvedValue(mockDevice);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await EditDevicePage({ params: Promise.resolve({ id: "device-1" }) });
    });
    render(jsx!);

    expect(screen.getByText("← Back to Devices")).toBeInTheDocument();
  });

  it("renders DeviceForm in edit mode", async () => {
    mockGetDeviceById.mockResolvedValue(mockDevice);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await EditDevicePage({ params: Promise.resolve({ id: "device-1" }) });
    });
    render(jsx!);

    expect(screen.getByTestId("device-form")).toBeInTheDocument();
  });

  it("has Save Changes button", async () => {
    mockGetDeviceById.mockResolvedValue(mockDevice);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await EditDevicePage({ params: Promise.resolve({ id: "device-1" }) });
    });
    render(jsx!);

    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("has Cancel button", async () => {
    mockGetDeviceById.mockResolvedValue(mockDevice);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await EditDevicePage({ params: Promise.resolve({ id: "device-1" }) });
    });
    render(jsx!);

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls getDeviceById with correct id from params", async () => {
    mockGetDeviceById.mockResolvedValue(mockDevice);

    await act(async () => {
      await EditDevicePage({ params: Promise.resolve({ id: "device-1" }) });
    });

    expect(mockGetDeviceById).toHaveBeenCalledWith("device-1");
  });
});