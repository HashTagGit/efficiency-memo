"use client";

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, EmptyState, PageHeader } from "@memo/ui";
import { chargerReminderDb } from "../db-tauri";
import { getCurrentUser } from "../../../lib/auth";
import { DeviceList } from "../components/device-list";
import type { DeviceWithChargeHistory } from "../contracts";
import { useI18n } from "../../../lib/i18n";

export default function DeviceListPage() {
  const [devices, setDevices] = useState<DeviceWithChargeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const { t } = useI18n();

  async function loadDevices() {
    try {
      setLoading(true);
      setFailed(false);
      const user = getCurrentUser();
      if (!user) {
        setFailed(true);
        return;
      }
      const result = await chargerReminderDb.listDevicesByUser(user.id);
      setDevices(result);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDevices();
  }, []);

  return (
    <div className="p-6">
      <PageHeader
        title={t("chargerReminder.title")}
        subtitle={t("chargerReminder.subtitle")}
        action={<Link
          to="/tools/charger-reminder/new"
          data-testid="add-device-link"
          className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong"
        >
          {t("chargerReminder.addDevice")}
        </Link>}
      />

      {loading ? (
        <p className="py-16 text-center text-sm text-muted" role="status" aria-live="polite">{t("chargerReminder.loadingDevices")}</p>
      ) : failed ? (
        <EmptyState
          title={t("chargerReminder.loadDevicesErrorTitle")}
          description={t("chargerReminder.loadDevicesErrorDescription")}
          action={<Button onClick={() => void loadDevices()}>{t("chargerReminder.retry")}</Button>}
        />
      ) : devices.length === 0 ? (
        <EmptyState
          title={t("chargerReminder.emptyTitle")}
          description={t("chargerReminder.emptyDescription")}
          action={<Link
            to="/tools/charger-reminder/new"
            className="text-sm font-semibold text-accent hover:underline"
          >
            {t("chargerReminder.emptyAction")}
          </Link>}
        />
      ) : (
        <DeviceList devices={devices} />
      )}
    </div>
  );
}
