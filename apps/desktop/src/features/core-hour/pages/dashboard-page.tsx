import React, { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { getCurrentUser } from "../../../lib/auth";
import { Dashboard } from "../components/dashboard";
import { SessionProvider } from "../hooks/use-session";
import { TagsProvider } from "../hooks/use-tags";
import HistoryPage from "./history-page";
import SettingsPage from "./settings-page";
import TagsPage from "./tags-page";
import { loadCheckInInterval } from "../settings";

function CoreHourHome() {
  const [intervalMinutes, setIntervalMinutes] = useState(30);

  useEffect(() => {
    void loadCheckInInterval().then(setIntervalMinutes);
  }, []);

  const user = getCurrentUser();
  return user ? <Dashboard userId={user.id} intervalMinutes={intervalMinutes} /> : null;
}

export default function CoreHourRoutes() {
  const user = getCurrentUser();
  if (!user) return null;

  return (
    <SessionProvider>
      <TagsProvider>
        <div className="space-y-6" data-testid="ch-dashboard">
          <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1 text-sm" aria-label="CoreHour navigation">
            {[
              ["/tools/core-hour", "Timer"],
              ["/tools/core-hour/history", "History"],
              ["/tools/core-hour/tags", "Tags"],
              ["/tools/core-hour/settings", "Settings"],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/tools/core-hour"}
                className={({ isActive }) => `rounded-md px-3 py-2 font-medium transition-colors ${isActive ? "bg-accent text-background" : "text-muted hover:bg-surface-strong hover:text-foreground"}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <Routes>
            <Route index element={<CoreHourHome />} />
            <Route path="history" element={<HistoryPage userId={user.id} />} />
            <Route path="tags" element={<TagsPage userId={user.id} />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </TagsProvider>
    </SessionProvider>
  );
}
