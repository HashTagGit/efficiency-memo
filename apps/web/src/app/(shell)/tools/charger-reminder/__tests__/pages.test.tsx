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

// Use vi.hoisted to keep mock fns in correct scope
const { mockListDevicesByUser, mockGetDeviceById } = vi.hoisted(() => ({
  mockListDevicesByUser: vi.fn(),
  mockGetDeviceById: vi.fn(),
}));

// Mock database
vi.mock("@/features/charger-reminder/database/devices", () => ({
  listDevicesByUser: mockListDevicesByUser,
  getDeviceById: mockGetDeviceById,
  deleteDevice: vi.fn(),
  createDevice: vi.fn(),
  updateDevice: vi.fn(),
  logChargeEvent: vi.fn(),
  setReminderPreference: vi.fn(),
  getDevicePresets: vi.fn(),
  getDefaultThresholdForPreset: vi.fn(),
  setComputedReminderState: vi.fn(),
  recomputeReminderStateForDevice: vi.fn(),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocks are set up
import DeviceListPage from "../page";
import DeviceDetailPage from "../[id]/page";

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

describe("DeviceListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders DeviceList component with devices prop", async () => {
    mockListDevicesByUser.mockResolvedValue([mockDevice]);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await DeviceListPage();
    });
    render(jsx!);

    expect(screen.getByTestId("device-list")).toBeInTheDocument();
  });

  it("passes devices array to DeviceList component", async () => {
    const devices = [
      mockDevice,
      { ...mockDevice, device: { ...mockDevice.device, id: "device-2", name: "Apple Magic Mouse" } },
    ];
    mockListDevicesByUser.mockResolvedValue(devices);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await DeviceListPage();
    });
    render(jsx!);

    expect(screen.getByText("Logitech MX Master 3")).toBeInTheDocument();
    expect(screen.getByText("Apple Magic Mouse")).toBeInTheDocument();
  });

  it("renders empty state when no devices", async () => {
    mockListDevicesByUser.mockResolvedValue([]);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await DeviceListPage();
    });
    render(jsx!);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });
});

describe("DeviceDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders DeviceDetail component with device data", async () => {
    mockGetDeviceById.mockResolvedValue(mockDevice);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await DeviceDetailPage({ params: Promise.resolve({ id: "device-1" }) });
    });
    render(jsx!);

    expect(screen.getByTestId("device-detail-device-1")).toBeInTheDocument();
  });

  it("receives correct id from params", async () => {
    mockGetDeviceById.mockResolvedValue(mockDevice);

    await act(async () => {
      await DeviceDetailPage({ params: Promise.resolve({ id: "device-1" }) });
    });

    expect(mockGetDeviceById).toHaveBeenCalledWith("device-1");
  });

  it("renders device name in DeviceDetail", async () => {
    mockGetDeviceById.mockResolvedValue(mockDevice);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = await DeviceDetailPage({ params: Promise.resolve({ id: "device-1" }) });
    });
    render(jsx!);

    expect(screen.getByText("Logitech MX Master 3")).toBeInTheDocument();
  });
});
