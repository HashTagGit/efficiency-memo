import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ShellLayout } from "./components/shell-layout";
import { DashboardPage } from "./pages/dashboard/page";
import { SignInPage } from "./pages/sign-in/page";
import { SyncSettingsPage } from "./pages/settings/sync/page";

// Lazy-load tool pages
const ChargerReminderPage = lazy(() =>
  import("./features/charger-reminder/pages/device-list-page").then((m) => ({
    default: m.default ?? (() => null),
  }))
);

const CoreHourPage = lazy(() =>
  import("./features/core-hour/pages/dashboard-page").then((m) => ({
    default: m.default ?? (() => null),
  }))
);

function ToolFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-muted">Loading tool...</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />

        <Route
          path="/*"
          element={
            <ShellLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route
                  path="/tools/charger-reminder/*"
                  element={
                    <Suspense fallback={<ToolFallback />}>
                      <ChargerReminderPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/tools/core-hour/*"
                  element={
                    <Suspense fallback={<ToolFallback />}>
                      <CoreHourPage />
                    </Suspense>
                  }
                />
                <Route path="/settings/sync" element={<SyncSettingsPage />} />
              </Routes>
            </ShellLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
