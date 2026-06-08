import HistoryPage from "../../../../features/core-hour/pages/history-page";

export default function CoreHourHistoryRoute() {
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
