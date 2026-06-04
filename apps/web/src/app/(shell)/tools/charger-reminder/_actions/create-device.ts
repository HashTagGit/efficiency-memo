"use server";

import { redirect } from "next/navigation";

import { createDevice } from "@/features/charger-reminder/database/devices";
import type { DeviceFormData } from "@/features/charger-reminder/components/device-form";

export async function createDeviceAction(data: DeviceFormData) {
  await createDevice({
    user_id: "mock-user-id",
    name: data.name,
    device_type: data.device_type,
    capacity_mah: data.capacity_mah,
    threshold_percent: data.threshold_percent,
    notes: data.notes,
  });

  redirect("/tools/charger-reminder");
}