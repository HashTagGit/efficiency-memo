"use client";

import React, { useEffect } from "react";
import { useHistory } from "@/features/core-hour/hooks/use-history";

export function HistoryPage() {
  const { sessions, loading, loadHistory } = useHistory();

  useEffect(() => {
    loadHistory("local");
  }, [loadHistory]);

  if (loading) {
    return (
      <div data-testid="ch-history-loading" className="text-sm text-muted-foreground">
        Loading sessions...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div
        data-testid="ch-history-empty"
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <p className="text-muted-foreground">No completed sessions yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start a session from the dashboard and end it to see it here.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="ch-history-list" className="space-y-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          data-testid={`ch-session-${session.id}`}
          className="rounded-lg border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {new Date(session.started_at).toLocaleDateString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(session.started_at).toLocaleTimeString()}
                {session.ended_at &&
                  ` — ${new Date(session.ended_at).toLocaleTimeString()}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono tabular-nums">
                {session.interval_minutes} min interval
              </p>
              {session.ended_at && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {Math.round(
                    (new Date(session.ended_at).getTime() -
                      new Date(session.started_at).getTime()) /
                      60000,
                  )}{" "}
                  min duration
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
