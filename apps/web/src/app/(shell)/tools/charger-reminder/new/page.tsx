import type { Metadata } from "next";
import Link from "next/link";

import { requireSessionUser } from "@/lib/auth/session";
import { getDevicePresets } from "@/features/charger-reminder/database/devices";
import { DeviceForm } from "@/features/charger-reminder/components/device-form";
import type { DevicePresetType } from "@/features/charger-reminder/database/contracts";
import { createDeviceAction } from "../_actions/create-device";

export const metadata: Metadata = {
  title: "New Device — Charger Reminder",
};

interface DevicePresetListItem {
  id: string;
  type: DevicePresetType;
  label: string;
  icon?: string;
  default_threshold: number;
}

export default async function NewDevicePage() {
  await requireSessionUser();
  const presets: DevicePresetListItem[] = await getDevicePresets();

  return (
    <div className="p-6 mx-auto max-w-2xl">
      <div className="mb-8">
        <Link
          href="/tools/charger-reminder"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent"
        >
          ← Back to Devices
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Add a new device</h1>
          <p className="text-muted mt-2">
            Track battery levels and get reminders when it is time to charge.
          </p>
        </div>

        <DeviceForm
          presets={presets}
          mode="create"
          onSubmit={createDeviceAction}
        />
      </div>
    </div>
  );
}