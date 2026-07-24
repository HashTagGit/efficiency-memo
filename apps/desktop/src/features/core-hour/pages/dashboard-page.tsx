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
          <nav className="flex flex-wrap gap-4 border-b pb-3 text-sm" aria-label="CoreHour navigation">
            <NavLink to="." end>Timer</NavLink>
            <NavLink to="history">History</NavLink>
            <NavLink to="tags">Tags</NavLink>
            <NavLink to="settings">Settings</NavLink>
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
