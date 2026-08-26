"use client";

import React from "react";
import type { DeviceWithChargeHistory } from "../contracts";

interface DeviceDetailProps {
  item: DeviceWithChargeHistory;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
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

export function DeviceDetail({ item }: DeviceDetailProps) {
  const { device, preset, reminder_preference, computed_reminder_state: reminderState, charge_events } = item;

  return (
    <div className="space-y-6" data-testid={`device-detail-${device.id}`}>
      <SectionCard title={device.name} description={preset?.label ?? device.device_type}>
        <div className="space-y-3">
          {device.capacity_mah && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Capacity</span>
              <span className="font-medium text-foreground">{device.capacity_mah} mAh</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted">Threshold</span>
            <span className="font-medium text-foreground">{device.threshold_percent}%</span>
          </div>

          {device.notes && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Notes</span>
              <span className="font-medium text-foreground">{device.notes}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted">Created</span>
            <span className="font-medium text-foreground">{formatDate(device.created_at)}</span>
          </div>
        </div>
      </SectionCard>

      {reminderState && (
        <SectionCard title="Reminder Settings" description="Current reminder status and settings">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Status</span>
              <span className="font-medium text-foreground capitalize">{reminderState.status}</span>
            </div>

            {reminderState.estimated_battery_percent !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Estimated Battery</span>
                <span className="font-medium text-foreground">{reminderState.estimated_battery_percent.toFixed(1)}%</span>
              </div>
            )}

            {reminderState.estimated_days_until_threshold !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Days Until Threshold</span>
                <span className="font-medium text-foreground">{reminderState.estimated_days_until_threshold} day{reminderState.estimated_days_until_threshold !== 1 ? "s" : ""}</span>
              </div>
            )}

            {reminder_preference && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Notify Before</span>
                <span className="font-medium text-foreground">{reminder_preference.notify_before_days} day{reminder_preference.notify_before_days !== 1 ? "s" : ""}</span>
              </div>
            )}

            {reminderState.reminder_due_at && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Reminder Due</span>
                <span className="font-medium text-foreground">{formatDate(reminderState.reminder_due_at)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted">Basis</span>
              <span className="font-medium text-foreground">{reminderState.basis}</span>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Charge History" description="Recent charging events">
        {charge_events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No charge events recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-semibold text-foreground">Charged At</th>
                  <th className="py-2 text-left font-semibold text-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {charge_events.map((event) => (
                  <tr key={event.id} className="border-b border-border">
                    <td className="py-2 text-foreground">{formatDateTime(event.charged_at)}</td>
                    <td className="py-2 text-muted">{event.notes ?? "—"}</td>
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
