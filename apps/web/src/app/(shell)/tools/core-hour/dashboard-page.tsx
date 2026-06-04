"use client";

import React from "react";
import { SessionProvider } from "@/features/core-hour/hooks/use-session";
import { TagsProvider } from "@/features/core-hour/hooks/use-tags";
import { Dashboard } from "@/features/core-hour/components/dashboard";
import { TagBar } from "@/features/core-hour/components/tag-bar";

export function DashboardPage() {
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
