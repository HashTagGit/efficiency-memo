import { useState, useCallback, useRef } from "react";
import type { Session } from "../types";
import { dbSelect } from "../../../lib/db";

/**
 * History of completed sessions with filtering.
 * Uses its own state (not context) since history is read-heavy and
 * doesn't need to stay in sync with the active session.
 */

export interface HistoryState {
  sessions: Session[];
  loading: boolean;
  loadHistory: (userId: string) => Promise<void>;
  filterByDate: (from: string, to: string) => Session[];
}

export function useHistory(): HistoryState {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  // Keep a ref so filterByDate always has latest data
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const loadHistory = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const rows = await dbSelect<Record<string, unknown>>(
        "SELECT * FROM ch_sessions WHERE user_id = $1 AND ended_at IS NOT NULL ORDER BY started_at DESC",
        [userId],
      );
      setSessions(
        rows.map(
          (r: Record<string, unknown>) =>
            ({
              id: r.id,
              user_id: r.user_id,
              started_at: r.started_at,
              ended_at: r.ended_at,
              interval_minutes: r.interval_minutes,
              synced: Boolean(r.synced),
            }) as unknown as Session,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const filterByDate = useCallback((from: string, to: string): Session[] => {
    return sessionsRef.current.filter((s) => {
      if (!s.ended_at) return false;
      return s.started_at >= from && s.ended_at <= to;
    });
  }, []);

  return { sessions, loading, loadHistory, filterByDate };
}
