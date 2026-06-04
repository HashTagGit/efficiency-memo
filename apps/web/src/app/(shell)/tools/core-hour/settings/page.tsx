import type { Metadata } from "next";
import { chManifest } from "@/features/core-hour/manifest";
import { SettingsPage } from "./settings-page";

export const metadata: Metadata = {
  title: `${chManifest.name} Settings`,
  description: "Configure CoreHour check-in interval and preferences",
};

export default function CoreHourSettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-muted mt-1 mb-6">
        Configure your check-in interval and preferences
      </p>
      <SettingsPage />
    </div>
  );
}
