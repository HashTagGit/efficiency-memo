import type { Metadata } from "next";
import { chManifest } from "@/features/core-hour/manifest";
import { HistoryPage } from "./history-page";

export const metadata: Metadata = {
  title: `${chManifest.name} History`,
  description: "View completed CoreHour sessions",
};

export default function CoreHourHistoryPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">Session History</h1>
      <p className="text-muted mt-1 mb-6">
        Browse your completed CoreHour sessions
      </p>
      <HistoryPage />
    </div>
  );
}
