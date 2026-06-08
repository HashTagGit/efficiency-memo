"use client";

import React, { useState } from "react";
import { Button } from "@memo/ui";
import type { DevicePresetType, DeviceRecord } from "../contracts";

interface DevicePreset {
  type: DevicePresetType;
  label: string;
  default_threshold: number;
}

interface DeviceFormProps {
  presets: DevicePreset[];
  device?: DeviceRecord | null;
  mode: "create" | "edit";
  onSubmit?: (data: DeviceFormData) => Promise<void> | void;
}

export interface DeviceFormData {
  name: string;
  capacity_mah: number | null;
  threshold_percent: number;
  reminder_enabled: boolean;
  device_type: DevicePresetType;
  notes?: string;
}

export function DeviceForm({ presets, device, mode, onSubmit }: DeviceFormProps) {
  const [name, setName] = useState(device?.name ?? "");
  const [capacity, setCapacity] = useState(device?.capacity_mah?.toString() ?? "");
  const [threshold, setThreshold] = useState(device?.threshold_percent ?? presets[0]?.default_threshold ?? 25);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Device name is required");
      return;
    }

    const capacityNum = capacity.trim() ? parseInt(capacity, 10) : null;
    if (capacity.trim() && (isNaN(capacityNum!) || capacityNum! <= 0)) {
      setError("Capacity must be a positive number");
      return;
    }

    if (threshold < 0 || threshold > 100) {
      setError("Threshold must be between 0 and 100");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData: DeviceFormData = {
        name: name.trim(),
        capacity_mah: capacityNum,
        threshold_percent: threshold,
        reminder_enabled: reminderEnabled,
        device_type: device?.device_type ?? presets[0]?.type ?? "wireless-mouse",
        notes: device?.notes ?? undefined,
      };

      if (onSubmit) {
        await onSubmit(formData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save device");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="device-form">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {mode === "create" ? "Add Device" : "Edit Device"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-semibold text-gray-700">
            Device Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Xbox Controller Battery Pack"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="deviceType" className="text-sm font-semibold text-gray-700">
            Device Type *
          </label>
          <select
            id="deviceType"
            value={device?.device_type ?? presets[0]?.type ?? "wireless-mouse"}
            onChange={() => {}}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {presets.map((preset) => (
              <option key={preset.type} value={preset.type}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="capacity" className="text-sm font-semibold text-gray-700">
            Capacity (mAh) <span className="text-gray-400">— Optional</span>
          </label>
          <input
            id="capacity"
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="e.g., 2400"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="threshold" className="text-sm font-semibold text-gray-700">
            Threshold ({threshold}%)
          </label>
          <input
            id="threshold"
            type="range"
            min="0"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
            className="w-full accent-blue-600"
          />
          <p className="text-sm text-gray-500">
            Reminder triggers when battery drops to {threshold}%
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            id="reminderEnabled"
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="reminderEnabled" className="text-sm font-semibold text-gray-700">
            Reminder Enabled
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="flex-1"
          >
            {mode === "create" ? "Add Device" : "Save Changes"}
          </Button>

          {mode === "edit" && (
            <Button type="button" variant="secondary" size="lg">
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
