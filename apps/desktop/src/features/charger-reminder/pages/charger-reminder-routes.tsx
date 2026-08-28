"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Routes, Route, useParams, useNavigate } from "react-router-dom";
import { Alert, Button, EmptyState } from "@memo/ui";
import DeviceListPage from "./device-list-page";
import { DeviceForm } from "../components/device-form";
import type { DeviceFormData } from "../components/device-form";
import { DeviceDetail } from "../components/device-detail";
import { chargerReminderDb } from "../db-tauri";
import { getCurrentUser } from "../../../lib/auth";
import { devicePresetSeeds } from "../device-presets";
import type { DeviceWithChargeHistory } from "../contracts";
import { useI18n } from "../../../lib/i18n";
import {
  isChargerReminderDue,
  loadChargerNotificationState,
  snoozeChargerNotification,
  type ChargerNotificationState,
} from "../charger-notifications";

const presets = devicePresetSeeds.map((p) => ({
  type: p.type,
  label: p.label,
  default_threshold: p.default_threshold,
}));

function useDevice(id: string | undefined) {
  const [device, setDevice] = useState<DeviceWithChargeHistory | null>(null);
  const [notificationState, setNotificationState] = useState<ChargerNotificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const [nextDevice, nextNotificationState] = await Promise.all([
        chargerReminderDb.getDeviceById(id),
        loadChargerNotificationState(id),
      ]);
      setDevice(nextDevice);
      setNotificationState(nextNotificationState);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { device, notificationState, setNotificationState, loading, failed, retry: load };
}

function DevicePageState({
  state,
  onRetry,
  onBack,
}: {
  state: "loading" | "failed" | "not-found";
  onRetry: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  if (state === "loading") {
    return <p className="py-16 text-center text-sm text-muted" role="status" aria-live="polite">{t("chargerReminder.loadingDevice")}</p>;
  }

  const failed = state === "failed";
  return (
    <EmptyState
      title={t(failed ? "chargerReminder.loadDeviceErrorTitle" : "chargerReminder.deviceNotFoundTitle")}
      description={t(failed ? "chargerReminder.loadDeviceErrorDescription" : "chargerReminder.deviceNotFoundDescription")}
      action={(
        <div className="flex flex-wrap justify-center gap-2">
          {failed && <Button onClick={onRetry}>{t("chargerReminder.retry")}</Button>}
          <Button variant="secondary" onClick={onBack}>{t("chargerReminder.backToDevices")}</Button>
        </div>
      )}
    />
  );
}

function NewDevicePage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  async function handleSubmit(data: DeviceFormData) {
    const user = getCurrentUser();
    if (!user) throw new Error("Not signed in");
    await chargerReminderDb.createDevice({
      user_id: user.id,
      name: data.name,
      device_type: data.device_type,
      capacity_mah: data.capacity_mah,
      threshold_percent: data.threshold_percent,
      notes: data.notes,
    });
    navigate("/tools/charger-reminder");
  }

  return (
    <div className="space-y-4 p-6">
      <Button variant="secondary" onClick={() => navigate("/tools/charger-reminder")}>{t("chargerReminder.backToDevices")}</Button>
      <DeviceForm presets={presets} mode="create" onSubmit={handleSubmit} />
    </div>
  );
}

function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const { device, notificationState, setNotificationState, loading, failed, retry } = useDevice(id);
  const [chargedSaved, setChargedSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(false);
  const back = () => navigate("/tools/charger-reminder");

  async function markCharged() {
    if (!id) return;
    setActionError(false);
    setChargedSaved(false);
    setBusy(true);
    try {
      await chargerReminderDb.logChargeEvent({ device_id: id, charged_at: new Date().toISOString() });
      await retry();
      setChargedSaved(true);
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  }

  async function snooze() {
    const dueAt = device?.computed_reminder_state?.reminder_due_at;
    if (!id || !dueAt) return;
    setActionError(false);
    setChargedSaved(false);
    setBusy(true);
    try {
      setNotificationState(await snoozeChargerNotification(id, dueAt));
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <DevicePageState state="loading" onRetry={() => void retry()} onBack={back} />;
  if (failed) return <DevicePageState state="failed" onRetry={() => void retry()} onBack={back} />;
  if (!device) return <DevicePageState state="not-found" onRetry={() => void retry()} onBack={back} />;
  const due = isChargerReminderDue(
    device.computed_reminder_state?.reminder_due_at ?? null,
    notificationState?.snoozed_until ?? null,
  );
  const snoozedUntil = notificationState?.snoozed_until
    && Date.parse(notificationState.snoozed_until) > Date.now()
    ? notificationState.snoozed_until
    : null;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="secondary" onClick={back}>{t("chargerReminder.backToDevices")}</Button>
        <div className="flex flex-wrap gap-2">
          {due && <Button variant="secondary" disabled={busy} onClick={() => void snooze()}>{t("chargerNotification.snooze")}</Button>}
          <Button disabled={busy} onClick={() => void markCharged()}>{t("chargerNotification.markCharged")}</Button>
          <Button variant="secondary" disabled={busy} onClick={() => navigate(`/tools/charger-reminder/${id}/edit`)}>{t("chargerReminder.editDevice")}</Button>
        </div>
      </div>
      {actionError && <Alert variant="error">{t("chargerNotification.actionError")}</Alert>}
      {chargedSaved && <Alert variant="success">{t("chargerNotification.chargedSaved")}</Alert>}
      {snoozedUntil && (
        <Alert variant="info">{t("chargerNotification.snoozedUntil", {
          date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" })
            .format(new Date(snoozedUntil)),
        })}</Alert>
      )}
      <DeviceDetail item={device} />
    </div>
  );
}

function EditDevicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { device, loading, failed, retry } = useDevice(id);
  const back = () => navigate("/tools/charger-reminder");

  async function handleSubmit(data: DeviceFormData) {
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
  }

  if (loading) return <DevicePageState state="loading" onRetry={() => void retry()} onBack={back} />;
  if (failed) return <DevicePageState state="failed" onRetry={() => void retry()} onBack={back} />;
  if (!device) return <DevicePageState state="not-found" onRetry={() => void retry()} onBack={back} />;

  return (
    <div className="p-6">
      <DeviceForm
        presets={presets}
        device={device.device}
        mode="edit"
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/tools/charger-reminder/${id}`)}
      />
    </div>
  );
}

export default function ChargerReminderRoutes() {
  return (
    <Routes>
      <Route index element={<DeviceListPage />} />
      <Route path="new" element={<NewDevicePage />} />
      <Route path=":id" element={<DeviceDetailPage />} />
      <Route path=":id/edit" element={<EditDevicePage />} />
    </Routes>
  );
}
