import type { DevicePresetRecord } from "./contracts";

export const devicePresetSeeds: ReadonlyArray<
  Omit<DevicePresetRecord, "created_at" | "updated_at">
> = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    type: "wireless-mouse",
    default_threshold: 25,
    estimated_drain_per_month: 8.5,
    label: "Wireless Mouse",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    type: "game-controller",
    default_threshold: 30,
    estimated_drain_per_month: 18,
    label: "Game Controller",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    type: "wireless-keyboard",
    default_threshold: 20,
    estimated_drain_per_month: 5.5,
    label: "Wireless Keyboard",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    type: "bluetooth-headphones",
    default_threshold: 35,
    estimated_drain_per_month: 28,
    label: "Bluetooth Headphones",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    type: "power-bank",
    default_threshold: 40,
    estimated_drain_per_month: 4,
    label: "Power Bank",
  },
] as const;
