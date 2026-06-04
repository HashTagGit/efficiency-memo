"use server";

import { redirect } from "next/navigation";

import { updateDevice } from "@/features/charger-reminder/database/devices";
import type { DeviceFormData } from "@/features/charger-reminder/components/device-form";

export async function updateDeviceAction(deviceId: string, data: DeviceFormData) {
  await updateDevice({
    id: deviceId,
    name: data.name,
    device_type: data.device_type,
    capacity_mah: data.capacity_mah,
    threshold_percent: data.threshold_percent,
    notes: data.notes,
  });

  redirect(`/tools/charger-reminder/${deviceId}`);
}