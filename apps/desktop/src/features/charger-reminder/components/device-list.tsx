"use client";

import React from "react";
import { DeviceCard } from "./device-card";
import type { DeviceWithChargeHistory } from "../contracts";

interface DeviceListProps {
  devices: DeviceWithChargeHistory[];
}

export function DeviceList({ devices }: DeviceListProps) {
  return (
    <div data-testid="device-list" className="grid gap-3 sm:grid-cols-2">
      {devices.map((item) => (
        <DeviceCard key={item.device.id} item={item} />
      ))}
    </div>
  );
}
