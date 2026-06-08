import SettingsPage from "../../../../features/core-hour/pages/settings-page";

export default function CoreHourSettingsRoute() {
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
