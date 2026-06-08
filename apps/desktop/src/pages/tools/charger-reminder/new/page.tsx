import { useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCurrentUser } from "../../../../lib/auth";
import { chargerReminderDb } from "../../../../features/charger-reminder/db-tauri";
import { devicePresetSeeds } from "../../../../features/charger-reminder/device-presets";
import { DeviceForm, type DeviceFormData } from "../../../../features/charger-reminder/components/device-form";
import type { DevicePresetType } from "../../../../features/charger-reminder/contracts";

interface DevicePresetListItem {
  id: string;
  type: DevicePresetType;
  label: string;
  default_threshold: number;
}

export default function NewDevicePage() {
  const navigate = useNavigate();
  const presets: DevicePresetListItem[] = devicePresetSeeds.map((seed) => ({
    id: seed.id,
    type: seed.type,
    label: seed.label,
    default_threshold: seed.default_threshold,
  }));

  const handleSubmit = useCallback(
    async (data: DeviceFormData) => {
      const user = getCurrentUser()!;
      if (!user) {
        throw new Error("Not signed in");
      }
      await chargerReminderDb.createDevice({
        user_id: user.id,
        name: data.name,
        device_type: data.device_type,
        capacity_mah: data.capacity_mah,
        threshold_percent: data.threshold_percent,
        notes: data.notes,
      });
      navigate("/tools/charger-reminder");
    },
    [navigate],
  );

  return (
    <div className="p-6 mx-auto max-w-2xl">
      <div className="mb-8">
        <Link
          to="/tools/charger-reminder"
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
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
