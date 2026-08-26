"use client";

import React, { useEffect, useState } from "react";
import { Routes, Route, useParams, useNavigate } from "react-router-dom";
import DeviceListPage from "./device-list-page";
import { DeviceForm } from "../components/device-form";
import type { DeviceFormData } from "../components/device-form";
import { DeviceDetail } from "../components/device-detail";
import { chargerReminderDb } from "../db-tauri";
import { getCurrentUser } from "../../../lib/auth";
import { devicePresetSeeds } from "../device-presets";
import type { DeviceWithChargeHistory } from "../contracts";

const presets = devicePresetSeeds.map((p) => ({
  type: p.type,
  label: p.label,
  default_threshold: p.default_threshold,
}));

function NewDevicePage() {
  const navigate = useNavigate();

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
    <div className="p-6">
      <DeviceForm presets={presets} mode="create" onSubmit={handleSubmit} />
    </div>
  );
}

function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [device, setDevice] = useState<DeviceWithChargeHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const result = await chargerReminderDb.getDeviceById(id);
        setDevice(result);
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
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Device not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <DeviceDetail item={device} />
    </div>
  );
}

function EditDevicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<DeviceWithChargeHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const result = await chargerReminderDb.getDeviceById(id);
        setDevice(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load device");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Loading device...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted">Device not found</p>
      </div>
    );
  }

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
