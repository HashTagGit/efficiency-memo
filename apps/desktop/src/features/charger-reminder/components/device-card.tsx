"use client";

import React from "react";
import { Card } from "@memo/ui";
import { useNavigate } from "react-router-dom";
import type { DeviceWithChargeHistory } from "../contracts";
import { useI18n } from "../../../lib/i18n";

function formatLastCharged(chargeEvents: { charged_at: string }[], locale: string): string | null {
  if (chargeEvents.length === 0) return null;
  const lastEvent = chargeEvents[0];
  const date = new Date(lastEvent.charged_at);
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

interface DeviceCardProps {
  item: DeviceWithChargeHistory;
}

export function DeviceCard({ item }: DeviceCardProps) {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const { device, preset, computed_reminder_state: reminderState, charge_events: chargeEvents } = item;

  const batteryPercent = reminderState?.estimated_battery_percent ?? null;
  const lastCharged = formatLastCharged(chargeEvents, locale);

  const title = device.name;
  const statusLabel = reminderState?.status
    ? t("chargerReminder.cardStatus", { status: t(`chargerReminder.status.${reminderState.status}`) })
    : null;
  const description = [
    batteryPercent !== null ? t("chargerReminder.cardCharge", { value: batteryPercent.toFixed(1) }) : null,
    device.capacity_mah ? t("chargerReminder.cardCapacity", { value: device.capacity_mah }) : null,
    lastCharged ? t("chargerReminder.cardLastCharged", { date: lastCharged }) : null,
    preset ? t(`chargerReminder.preset.${preset.type}`) : null,
    statusLabel,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <Card
      title={title}
      description={description || t("chargerReminder.noChargeData")}
      openLabel={t("chargerReminder.viewDetails")}
      onClick={() => navigate(`/tools/charger-reminder/${device.id}`)}
      data-testid={`device-card-${device.id}`}
    />
  );
}
