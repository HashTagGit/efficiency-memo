import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../../../lib/auth";
import { chargerReminderDb } from "../../../features/charger-reminder/db-tauri";
import { DeviceList } from "../../../features/charger-reminder/components/device-list";
import type { DeviceWithChargeHistory } from "../../../features/charger-reminder/contracts";

export default function ChargerReminderListPage() {
  const [devices, setDevices] = useState<DeviceWithChargeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDevices() {
    try {
      setLoading(true);
      setError(null);
      const user = getCurrentUser()!;
      if (!user) {
        throw new Error("Not signed in");
      }
      const result = await chargerReminderDb.listDevicesByUser(user.id);
      setDevices(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Loading devices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadDevices}
          className="mt-4 text-sm font-medium text-accent hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

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
          to="/tools/charger-reminder/new"
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
            to="/tools/charger-reminder/new"
            className="mt-4 text-sm font-medium text-accent hover:underline"
          >
            Add your first device
          </Link>
        </div>
      ) : (
        <DeviceList devices={devices} />
      )}
    </div>
  );
}
