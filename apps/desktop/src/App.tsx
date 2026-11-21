import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ShellLayout } from "./components/shell-layout";
import { DashboardPage } from "./pages/dashboard/page";
import { SyncSettingsPage } from "./pages/settings/sync/page";
import { AppSettingsPage } from "./pages/settings/page";
import { DataPrivacyPage } from "./pages/settings/data-privacy-page";
import { useI18n } from "./lib/i18n";
import { DesktopCompanionBridge } from "./components/desktop-companion-bridge";
import { ReviewReminderBridge } from "./components/review-reminder-bridge";
import { loadPetAssistantPage, PET_ASSISTANT_ROUTE } from "./features/pet-assistant";

// Lazy-load tool pages
const CoreHourPage = lazy(() =>
  import("./features/core-hour/pages/dashboard-page").then((m) => ({
    default: m.default ?? (() => null),
  }))
);

const PauseHydratePage = lazy(() =>
  import("./features/pause-hydrate/pages/pause-hydrate-page").then((module) => ({
    default: module.default ?? (() => null),
  }))
);
const PetAssistantPage = lazy(loadPetAssistantPage);

function ToolFallback() {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-muted">{t("app.loading")}</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <DesktopCompanionBridge />
      <ReviewReminderBridge />
      <Routes>
        <Route path="/sign-in" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/*"
          element={
            <ShellLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route
                  path="/tools/core-hour/*"
                  element={
                    <Suspense fallback={<ToolFallback />}>
                      <CoreHourPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/tools/pause-hydrate"
                  element={
                    <Suspense fallback={<ToolFallback />}>
                      <PauseHydratePage />
                    </Suspense>
                  }
                />
                <Route
                  path={PET_ASSISTANT_ROUTE}
                  element={
                    <Suspense fallback={<ToolFallback />}>
                      <PetAssistantPage />
                    </Suspense>
                  }
                />
                <Route path="/settings" element={<AppSettingsPage />} />
                <Route path="/settings/data" element={<DataPrivacyPage />} />
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
