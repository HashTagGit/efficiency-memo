import type { Metadata } from "next";
import { chManifest } from "@/features/core-hour/manifest";
import { DashboardPage } from "./dashboard-page";

export const metadata: Metadata = {
  title: chManifest.name,
  description: chManifest.description,
};

export default function CoreHourDashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">{chManifest.name}</h1>
      <p className="text-muted mt-1 mb-6">{chManifest.description}</p>
      <DashboardPage />
    </div>
  );
}
