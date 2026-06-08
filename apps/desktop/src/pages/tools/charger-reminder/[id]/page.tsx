import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { chargerReminderDb } from "../../../../features/charger-reminder/db-tauri";
import { DeviceDetail } from "../../../../features/charger-reminder/components/device-detail";
import type { DeviceWithChargeHistory } from "../../../../features/charger-reminder/contracts";
export default function ChargerReminderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DeviceWithChargeHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const result = await chargerReminderDb.getDeviceById(id);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load device");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

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

  if (!data) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-lg font-semibold text-gray-700">Device Not Found</h2>
        <Link to="/tools/charger-reminder" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
          ← Back to Devices
        </Link>
      </div>
    );
  }

  const { device } = data;

  return (
    <div className="p-6 mx-auto max-w-3xl">
      <div className="mb-8">
        <Link
          to="/tools/charger-reminder"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent"
        >
          ← Back to Devices
        </Link>
      </div>

      <DeviceDetail item={data} />

      <div className="mt-6 flex gap-3">
        <Link
          to={`/tools/charger-reminder/${device.id}/edit`}
          data-testid="edit-device-link"
          className="inline-flex items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted/20"
        >
          Edit Device
        </Link>
      </div>
    </div>
  );
}
