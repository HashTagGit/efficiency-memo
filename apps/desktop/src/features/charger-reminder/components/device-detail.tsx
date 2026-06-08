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
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-500">{description}</p>}
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
              <span className="text-gray-500">Capacity</span>
              <span className="font-medium text-gray-900">{device.capacity_mah} mAh</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Threshold</span>
            <span className="font-medium text-gray-900">{device.threshold_percent}%</span>
          </div>

          {device.notes && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Notes</span>
              <span className="font-medium text-gray-900">{device.notes}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Created</span>
            <span className="font-medium text-gray-900">{formatDate(device.created_at)}</span>
          </div>
        </div>
      </SectionCard>

      {reminderState && (
        <SectionCard title="Reminder Settings" description="Current reminder status and settings">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-gray-900 capitalize">{reminderState.status}</span>
            </div>

            {reminderState.estimated_battery_percent !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Estimated Battery</span>
                <span className="font-medium text-gray-900">{reminderState.estimated_battery_percent.toFixed(1)}%</span>
              </div>
            )}

            {reminderState.estimated_days_until_threshold !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Days Until Threshold</span>
                <span className="font-medium text-gray-900">{reminderState.estimated_days_until_threshold} day{reminderState.estimated_days_until_threshold !== 1 ? "s" : ""}</span>
              </div>
            )}

            {reminder_preference && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Notify Before</span>
                <span className="font-medium text-gray-900">{reminder_preference.notify_before_days} day{reminder_preference.notify_before_days !== 1 ? "s" : ""}</span>
              </div>
            )}

            {reminderState.reminder_due_at && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reminder Due</span>
                <span className="font-medium text-gray-900">{formatDate(reminderState.reminder_due_at)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Basis</span>
              <span className="font-medium text-gray-900">{reminderState.basis}</span>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Charge History" description="Recent charging events">
        {charge_events.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No charge events recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-semibold text-gray-700">Charged At</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {charge_events.map((event) => (
                  <tr key={event.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-900">{formatDateTime(event.charged_at)}</td>
                    <td className="py-2 text-gray-600">{event.notes ?? "—"}</td>
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
