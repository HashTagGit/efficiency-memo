"use client";

import React from "react";
import { DeviceCard } from "./device-card";
import type { DeviceWithChargeHistory } from "@/features/charger-reminder/database/contracts";

interface DeviceListProps {
  devices: DeviceWithChargeHistory[];
}

export function DeviceList({ devices }: DeviceListProps) {
  if (devices.length === 0) {
    return (
      <div data-testid="device-list-empty" style={{ textAlign: "center", padding: "2rem" }}>
        <p>No devices yet</p>
      </div>
    );
  }

  return (
    <div data-testid="device-list" style={{ display: "grid", gap: "1rem" }}>
      {devices.map((item) => (
        <DeviceCard key={item.device.id} item={item} />
      ))}
    </div>
  );
}