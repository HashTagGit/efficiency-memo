"use client";

import React, { useState } from "react";
import { Button } from "@memo/ui";
import type { DevicePresetType, DeviceRecord } from "../contracts";
import { useI18n } from "../../../lib/i18n";

function getInitialDeviceType(
  device: DeviceRecord | null | undefined,
  presets: DevicePreset[],
): DevicePresetType {
  return device?.device_type ?? presets[0]?.type ?? "wireless-mouse";
}

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
  onCancel?: () => void;
}

export interface DeviceFormData {
  name: string;
  capacity_mah: number | null;
  threshold_percent: number;
  device_type: DevicePresetType;
  notes?: string;
}

export function DeviceForm({ presets, device, mode, onSubmit, onCancel }: DeviceFormProps) {
  const { t } = useI18n();
  const [name, setName] = useState(device?.name ?? "");
  const [capacity, setCapacity] = useState(device?.capacity_mah?.toString() ?? "");
  const [threshold, setThreshold] = useState(device?.threshold_percent ?? presets[0]?.default_threshold ?? 25);
  const [deviceType, setDeviceType] = useState<DevicePresetType>(getInitialDeviceType(device, presets));
  const [notes, setNotes] = useState(device?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("chargerReminder.validationName"));
      return;
    }

    const capacityNum = capacity.trim() ? parseInt(capacity, 10) : null;
    if (capacity.trim() && (isNaN(capacityNum!) || capacityNum! <= 0)) {
      setError(t("chargerReminder.validationCapacity"));
      return;
    }

    if (threshold < 0 || threshold > 100) {
      setError(t("chargerReminder.validationThreshold"));
      return;
    }

    setIsSubmitting(true);

    try {
      const formData: DeviceFormData = {
        name: name.trim(),
        capacity_mah: capacityNum,
        threshold_percent: threshold,
        device_type: deviceType,
        notes: notes.trim() || undefined,
      };

      if (onSubmit) {
        await onSubmit(formData);
      }
    } catch {
      setError(t("chargerReminder.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm" data-testid="device-form">
      <h2 className="mb-6 text-lg font-semibold text-foreground">
        {t(mode === "create" ? "chargerReminder.formAddTitle" : "chargerReminder.formEditTitle")}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-semibold text-foreground">
            {t("chargerReminder.deviceName")}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("chargerReminder.deviceNamePlaceholder")}
            className="w-full rounded-md border border-control-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="deviceType" className="text-sm font-semibold text-foreground">
            {t("chargerReminder.deviceType")}
          </label>
          <select
            id="deviceType"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value as DevicePresetType)}
            className="w-full rounded-md border border-control-border bg-background px-4 py-3 text-base text-foreground focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
          >
            {presets.map((preset) => (
              <option key={preset.type} value={preset.type}>
                {t(`chargerReminder.preset.${preset.type}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="capacity" className="text-sm font-semibold text-foreground">
            {t("chargerReminder.capacity")} <span className="font-normal text-muted">({t("chargerReminder.optional")})</span>
          </label>
          <input
            id="capacity"
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder={t("chargerReminder.capacityPlaceholder")}
            className="w-full rounded-md border border-control-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="threshold" className="text-sm font-semibold text-foreground">
            {t("chargerReminder.threshold", { value: threshold })}
          </label>
          <input
            id="threshold"
            type="range"
            min="0"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
            className="w-full accent-accent"
          />
          <p className="text-sm text-muted">
            {t("chargerReminder.thresholdHint", { value: threshold })}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-semibold text-foreground">
            {t("chargerReminder.notes")} <span className="font-normal text-muted">({t("chargerReminder.optional")})</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t("chargerReminder.notesPlaceholder")}
            className="min-h-24 w-full rounded-md border border-control-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
          />
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
            {t(mode === "create" ? "chargerReminder.addDevice" : "chargerReminder.saveChanges")}
          </Button>

          {mode === "edit" && (
            <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
              {t("chargerReminder.cancel")}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
