import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { requireSessionUser } from "@/lib/auth/session";
import { getDeviceById } from "@/features/charger-reminder/database/devices";
import type { ReminderHeuristicStatus } from "@/features/charger-reminder/reminders/heuristic-engine";
import { DeviceDetailPageWrapper } from "@/app/(shell)/tools/charger-reminder/components/device-detail-page-wrapper";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_KINDS: Record<ReminderHeuristicStatus, string> = {
  "needs-charge-log": "bg-gray-100 text-gray-700",
  tracking: "bg-blue-100 text-blue-700",
  remind: "bg-yellow-100 text-yellow-700",
  "charge-now": "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<ReminderHeuristicStatus, string> = {
  "needs-charge-log": "Needs Charge Log",
  tracking: "Tracking",
  remind: "Reminder Due",
  "charge-now": "Charge Now",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getDeviceById(id);
  if (!data) return { title: "Device Not Found" };
  return { title: `${data.device.name} — Charger Reminder` };
}

export default async function DeviceDetailPage({ params }: Props) {
  await requireSessionUser();
  const { id } = await params;

  const data = await getDeviceById(id);
  if (!data) {
    notFound();
  }

  const { device, computed_reminder_state } = data;
  const status: ReminderHeuristicStatus =
    (computed_reminder_state?.status as ReminderHeuristicStatus) ??
    "needs-charge-log";

  return (
    <div className="p-6 mx-auto max-w-3xl">
      <div className="mb-8">
        <Link
          href="/tools/charger-reminder"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent"
        >
          ← Back to Devices
        </Link>
      </div>

      <DeviceDetailPageWrapper item={data} />

      <div className="mt-6 flex gap-3">
        <Link
          href={`/tools/charger-reminder/${device.id}/edit`}
          data-testid="edit-device-link"
          className="inline-flex items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted/20"
        >
          Edit Device
        </Link>
      </div>
    </div>
  );
}