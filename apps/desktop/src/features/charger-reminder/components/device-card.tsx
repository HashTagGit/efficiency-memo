"use client";

import React from "react";
import { Card } from "@memo/ui";
import type { DeviceWithChargeHistory } from "../contracts";

function formatLastCharged(chargeEvents: { charged_at: string }[]): string | null {
  if (chargeEvents.length === 0) return null;
  const lastEvent = chargeEvents[0];
  const date = new Date(lastEvent.charged_at);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface DeviceCardProps {
  item: DeviceWithChargeHistory;
}

export function DeviceCard({ item }: DeviceCardProps) {
  const { device, preset, computed_reminder_state: reminderState, charge_events: chargeEvents } = item;

  const batteryPercent = reminderState?.estimated_battery_percent ?? null;
  const lastCharged = formatLastCharged(chargeEvents);

  const title = device.name;
  const statusLabel = reminderState?.status ? `Status: ${reminderState.status}` : null;
  const description = [
    batteryPercent !== null ? `Charge: ${batteryPercent.toFixed(1)}%` : null,
    device.capacity_mah ? `Capacity: ${device.capacity_mah} mAh` : null,
    lastCharged ? `Last charged: ${lastCharged}` : null,
    preset?.label ? preset.label : null,
    statusLabel,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Card
      title={title}
      description={description || "No charge data"}
      data-testid={`device-card-${device.id}`}
    />
  );
}
