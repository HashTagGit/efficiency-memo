"use client";

import React from "react";
import type { DeviceWithChargeHistory } from "@/features/charger-reminder/database/contracts";
import { DeviceDetail as DeviceDetailComponent } from "@/features/charger-reminder/components/device-detail";

interface DeviceDetailPageWrapperProps {
  item: DeviceWithChargeHistory;
}

export function DeviceDetailPageWrapper({ item }: DeviceDetailPageWrapperProps) {
  return <DeviceDetailComponent item={item} />;
}