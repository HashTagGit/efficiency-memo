import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";

import { requireSessionUser } from "@/lib/auth/session";
import {
  listDevicesByUser,
  deleteDevice,
} from "@/features/charger-reminder/database/devices";
import { crManifest } from "@/features/charger-reminder/manifest";
import { DeviceListPageWrapper } from "./components/device-list-page-wrapper";

export const metadata: Metadata = {
  title: crManifest.name,
  description: crManifest.description,
};

async function deleteDeviceAction(formData: FormData) {
  "use server";
  const deviceId = formData.get("deviceId") as string;
  if (deviceId) {
    await deleteDevice(deviceId);
  }
  revalidatePath("/tools/charger-reminder");
}

export default async function DeviceListPage() {
  const user = await requireSessionUser();
  const devices = await listDevicesByUser(user.id);

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Charger Reminder</h1>
          <p className="text-muted mt-1">
            Manage your battery-powered devices and charging reminders
          </p>
        </div>
        <Link
          href="/tools/charger-reminder/new"
          data-testid="add-device-link"
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background hover:bg-accent-strong"
        >
          Add Device
        </Link>
      </div>

      {devices.length === 0 ? (
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <h2 className="text-lg font-semibold text-gray-700">
            No devices yet
          </h2>
          <p className="text-muted mt-1">
            Add your first device to start tracking battery levels
          </p>
          <Link
            href="/tools/charger-reminder/new"
            className="mt-4 text-sm font-medium text-accent hover:underline"
          >
            Add your first device
          </Link>
        </div>
      ) : (
        <DeviceListPageWrapper devices={devices} />
      )}
    </div>
  );
}