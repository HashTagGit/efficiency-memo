"use client";

import React from "react";
import type { DeviceWithChargeHistory } from "../contracts";
import { useI18n } from "../../../lib/i18n";

interface DeviceDetailProps {
  item: DeviceWithChargeHistory;
}

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function statusTone(status: string): string {
  if (status === "tracking") return "text-success";
  if (status === "remind") return "text-warning";
  if (status === "charge-now") return "text-danger";
  return "text-info";
}

export function DeviceDetail({ item }: DeviceDetailProps) {
  const { locale, t } = useI18n();
  const { device, preset, reminder_preference, computed_reminder_state: reminderState, charge_events } = item;

  return (
    <div className="space-y-6" data-testid={`device-detail-${device.id}`}>
      <SectionCard title={device.name} description={t(`chargerReminder.preset.${preset?.type ?? device.device_type}`)}>
        <div className="space-y-3">
          {device.capacity_mah && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("chargerReminder.capacity")}</span>
              <span className="font-medium text-foreground">{device.capacity_mah} mAh</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted">{t("chargerReminder.thresholdLabel")}</span>
            <span className="font-medium text-foreground">{device.threshold_percent}%</span>
          </div>

          {device.notes && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("chargerReminder.notes")}</span>
              <span className="font-medium text-foreground">{device.notes}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted">{t("chargerReminder.created")}</span>
            <span className="font-medium text-foreground">{formatDate(device.created_at, locale)}</span>
          </div>
        </div>
      </SectionCard>

      {reminderState && (
        <SectionCard title={t("chargerReminder.reminderSettings")} description={t("chargerReminder.reminderSettingsHint")}>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("chargerReminder.statusLabel")}</span>
              <span className={`font-semibold ${statusTone(reminderState.status)}`}>{t(`chargerReminder.status.${reminderState.status}`)}</span>
            </div>

            {reminderState.estimated_battery_percent !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t("chargerReminder.estimatedBattery")}</span>
                <span className="font-medium text-foreground">{reminderState.estimated_battery_percent.toFixed(1)}%</span>
              </div>
            )}

            {reminderState.estimated_days_until_threshold !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t("chargerReminder.daysUntilThreshold")}</span>
                <span className="font-medium text-foreground">{t(reminderState.estimated_days_until_threshold === 1 ? "chargerReminder.oneDay" : "chargerReminder.days", { count: reminderState.estimated_days_until_threshold })}</span>
              </div>
            )}

            {reminder_preference && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t("chargerReminder.notifyBefore")}</span>
                <span className="font-medium text-foreground">{t(reminder_preference.notify_before_days === 1 ? "chargerReminder.oneDay" : "chargerReminder.days", { count: reminder_preference.notify_before_days })}</span>
              </div>
            )}

            {reminderState.reminder_due_at && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t("chargerReminder.reminderDue")}</span>
                <span className="font-medium text-foreground">{formatDate(reminderState.reminder_due_at, locale)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("chargerReminder.estimateBasisLabel")}</span>
              <span className="max-w-md text-right font-medium text-foreground">{t("chargerReminder.estimateBasis")}</span>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title={t("chargerReminder.chargeHistory")} description={t("chargerReminder.chargeHistoryHint")}>
        {charge_events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">{t("chargerReminder.noChargeEvents")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-semibold text-foreground">{t("chargerReminder.chargedAt")}</th>
                  <th className="py-2 text-left font-semibold text-foreground">{t("chargerReminder.notes")}</th>
                </tr>
              </thead>
              <tbody>
                {charge_events.map((event) => (
                  <tr key={event.id} className="border-b border-border">
                    <td className="py-2 text-foreground">{formatDateTime(event.charged_at, locale)}</td>
                    <td className="py-2 text-muted">{event.notes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
