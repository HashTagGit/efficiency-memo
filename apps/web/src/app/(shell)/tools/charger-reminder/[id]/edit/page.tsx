import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { requireSessionUser } from "@/lib/auth/session";
import {
  getDeviceById,
  getDevicePresets,
} from "@/features/charger-reminder/database/devices";
import { EditDeviceForm } from "./edit-form";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getDeviceById(id);
  if (!data) return { title: "Edit Device Not Found" };
  return { title: `Edit ${data.device.name} — Charger Reminder` };
}

interface Preset {
  id: string;
  type: string;
  label: string;
  icon?: string;
  default_threshold: number;
}

export default async function EditDevicePage({ params }: Props) {
  await requireSessionUser();
  const { id } = await params;

  const data = await getDeviceById(id);
  if (!data) {
    notFound();
  }

  const presets = await getDevicePresets();

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
          <h1 className="text-2xl font-bold">{data.device.name}</h1>
          <p className="text-muted mt-2">
            Update your device settings and preferences.
          </p>
        </div>

        <EditDeviceForm
          presets={presets as Preset[]}
          device={data.device}
        />
      </div>
    </div>
  );
}