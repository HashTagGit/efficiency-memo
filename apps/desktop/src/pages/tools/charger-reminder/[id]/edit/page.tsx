import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { chargerReminderDb } from "../../../../../features/charger-reminder/db-tauri";
import { devicePresetSeeds } from "../../../../../features/charger-reminder/device-presets";
import { DeviceForm, type DeviceFormData } from "../../../../../features/charger-reminder/components/device-form";
import type { DeviceRecord, DevicePresetType } from "../../../../../features/charger-reminder/contracts";

interface Preset {
  id: string;
  type: DevicePresetType;
  label: string;
  default_threshold: number;
}

export default function EditDevicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<DeviceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const result = await chargerReminderDb.getDeviceById(id);
        if (result) {
          setDevice(result.device);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load device");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const presets: Preset[] = devicePresetSeeds.map((seed) => ({
    id: seed.id,
    type: seed.type,
    label: seed.label,
    default_threshold: seed.default_threshold,
  }));

  const handleSubmit = useCallback(
    async (data: DeviceFormData) => {
      if (!id) return;
      await chargerReminderDb.updateDevice({
        id,
        name: data.name,
        device_type: data.device_type,
        capacity_mah: data.capacity_mah,
        threshold_percent: data.threshold_percent,
        notes: data.notes,
      });
      navigate(`/tools/charger-reminder/${id}`);
    },
    [id, navigate],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Loading device...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Link to="/tools/charger-reminder" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
          ← Back to Devices
        </Link>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-700">Device Not Found</h2>
        <Link to="/tools/charger-reminder" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
          ← Back to Devices
        </Link>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">{device.name}</h1>
          <p className="text-muted mt-2">
            Update your device settings and preferences.
          </p>
        </div>

        <DeviceForm
          presets={presets}
          device={device}
          mode="edit"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
