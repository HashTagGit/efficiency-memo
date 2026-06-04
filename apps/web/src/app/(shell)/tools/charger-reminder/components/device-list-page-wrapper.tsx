"use client";

import React from "react";
import type { DeviceWithChargeHistory } from "@/features/charger-reminder/database/contracts";
import { DeviceList as DeviceListComponent } from "@/features/charger-reminder/components/device-list";

interface DeviceListPageWrapperProps {
  devices: DeviceWithChargeHistory[];
}

export function DeviceListPageWrapper({ devices }: DeviceListPageWrapperProps) {
  return <DeviceListComponent devices={devices} />;
}