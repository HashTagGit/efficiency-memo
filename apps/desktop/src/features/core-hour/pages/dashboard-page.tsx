import React from "react";
import { SessionProvider } from "../hooks/use-session";
import { TagsProvider } from "../hooks/use-tags";
import { Dashboard } from "../components/dashboard";
import { TagBar } from "../components/tag-bar";

export default function DashboardPage() {
  const userId = "local";

  return (
    <SessionProvider>
      <TagsProvider>
        <div className="grid gap-6 lg:grid-cols-2" data-testid="ch-dashboard">
          <div data-testid="ch-dashboard-panel">
            <Dashboard userId={userId} />
          </div>
          <div data-testid="ch-tag-bar">
            <TagBar userId={userId} />
          </div>
        </div>
      </TagsProvider>
    </SessionProvider>
  );
}
