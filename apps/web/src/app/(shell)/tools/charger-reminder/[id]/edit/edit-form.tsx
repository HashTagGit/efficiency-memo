"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import type { DeviceRecord } from "@/features/charger-reminder/database/contracts";
import { updateDevice } from "@/features/charger-reminder/database/devices";
import { DeviceForm, type DeviceFormData } from "@/features/charger-reminder/components/device-form";

interface Preset {
  id: string;
  type: string;
  label: string;
  icon?: string;
  default_threshold: number;
}

interface EditFormProps {
  presets: Preset[];
  device: DeviceRecord;
}

export function EditDeviceForm({ presets, device }: EditFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(device?.threshold_percent ?? 25);

  const handleSubmit = useCallback(
    async (data: DeviceFormData) => {
      setError("");
      try {
        await updateDevice({
          id: device.id,
          name: data.name,
          device_type: data.device_type,
          capacity_mah: data.capacity_mah,
          threshold_percent: data.threshold_percent,
          notes: data.notes,
        });
        router.push(`/tools/charger-reminder/${device.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update device");
      }
    },
    [router, device],
  );

  return (
    <DeviceForm
      presets={presets.map(p => ({
        type: p.type as "wireless-mouse" | "game-controller" | "wireless-keyboard" | "bluetooth-headphones" | "power-bank",
        label: p.label,
        default_threshold: p.default_threshold,
      }))}
      device={device}
      mode="edit"
      onSubmit={handleSubmit}
    />
  );
}