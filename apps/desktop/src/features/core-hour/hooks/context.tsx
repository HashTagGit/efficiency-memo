import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CheckInWithTag, Session, Tag } from "../types";
import { dbExecute, dbSelect } from "../../../lib/db";
import { hasProgressChanged, unrecordedSeconds } from "../session-math";

const SESSION_PROGRESS_KEY = "core-hour-active-session";

type StoredProgress = {
  sessionId: string;
  elapsedSeconds: number;
  recordedSeconds: number;
};

function mapSession(row: Record<string, unknown>): Session {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    started_at: String(row.started_at),
    ended_at: row.ended_at ? String(row.ended_at) : null,
    interval_minutes: Number(row.interval_minutes),
    elapsed_seconds: Number(row.elapsed_seconds ?? 0),
    recorded_seconds: 0,
    synced: Boolean(row.synced),
  };
}

export interface SessionState {
  activeSession: Session | null;
  pendingCheckIn: CheckInWithTag | null;
  loadSessions: (userId: string) => Promise<void>;
  startSession: (userId: string, intervalMinutes: number) => Promise<Session>;
  saveProgress: (elapsedSeconds: number, recordedSeconds: number) => void;
  createCheckIn: (durationSeconds: number) => Promise<void>;
  completeCheckIn: (tagId: string | null, note: string) => Promise<void>;
  endSession: (elapsedSeconds: number, recordedSeconds: number) => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [pendingCheckIn, setPendingCheckIn] = useState<CheckInWithTag | null>(null);
  const activeRef = useRef(activeSession);
  const completingRef = useRef(false);
  activeRef.current = activeSession;

  const loadSessions = useCallback(async (userId: string) => {
    const rows = await dbSelect<Record<string, unknown>>(
      "SELECT * FROM ch_sessions WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
      [userId],
    );
    const active = rows[0] ? mapSession(rows[0]) : null;
    const stored = active ? readProgress(active.id) : null;
    setActiveSession(
      active && stored
        ? { ...active, elapsed_seconds: stored.elapsedSeconds, recorded_seconds: stored.recordedSeconds }
        : active,
    );
    if (active) {
      const [pending] = await dbSelect<CheckInWithTag>(
        "SELECT ci.id, ci.session_id, ci.checked_at, ci.skipped, ci.note, ci.duration_seconds, ci.synced, NULL AS tag_id, NULL AS tag_name, NULL AS tag_color FROM ch_check_ins ci WHERE ci.session_id = $1 AND ci.skipped = 0 AND NOT EXISTS (SELECT 1 FROM ch_check_in_entries e WHERE e.check_in_id = ci.id) ORDER BY ci.checked_at ASC LIMIT 1",
        [active.id],
      );
      if (pending) {
        setPendingCheckIn({ ...pending, skipped: Boolean(pending.skipped), duration_seconds: Number(pending.duration_seconds) });
      }
    }
  }, []);

  const startSession = useCallback(async (userId: string, intervalMinutes: number) => {
    const session: Session = {
      id: crypto.randomUUID(),
      user_id: userId,
      started_at: new Date().toISOString(),
      ended_at: null,
      interval_minutes: intervalMinutes,
      elapsed_seconds: 0,
      recorded_seconds: 0,
      synced: false,
    };
    await dbExecute(
      "INSERT INTO ch_sessions (id, user_id, started_at, ended_at, interval_minutes, elapsed_seconds, synced) VALUES ($1, $2, $3, NULL, $4, 0, 0)",
      [session.id, session.user_id, session.started_at, session.interval_minutes],
    );
    localStorage.setItem(SESSION_PROGRESS_KEY, JSON.stringify({
      sessionId: session.id,
      elapsedSeconds: 0,
      recordedSeconds: 0,
    } satisfies StoredProgress));
    setActiveSession(session);
    return session;
  }, []);

  const saveProgress = useCallback((elapsedSeconds: number, recordedSeconds: number) => {
    const current = activeRef.current;
    if (!current) return;
    localStorage.setItem(SESSION_PROGRESS_KEY, JSON.stringify({
      sessionId: current.id,
      elapsedSeconds,
      recordedSeconds,
    } satisfies StoredProgress));
    setActiveSession((session) => {
      if (!session || !hasProgressChanged(
        session.elapsed_seconds,
        session.recorded_seconds,
        elapsedSeconds,
        recordedSeconds,
      )) return session;
      return { ...session, elapsed_seconds: elapsedSeconds, recorded_seconds: recordedSeconds };
    });
  }, []);

  const createCheckIn = useCallback(async (durationSeconds: number) => {
    const current = activeRef.current;
    if (!current || pendingCheckIn) return;
    const checkIn: CheckInWithTag = {
      id: crypto.randomUUID(),
      session_id: current.id,
      checked_at: new Date().toISOString(),
      skipped: false,
      note: "",
      duration_seconds: durationSeconds,
      synced: false,
      tag_id: null,
      tag_name: null,
      tag_color: null,
    };
    await dbExecute(
      "INSERT INTO ch_check_ins (id, session_id, checked_at, skipped, note, duration_seconds, synced) VALUES ($1, $2, $3, 0, '', $4, 0)",
      [checkIn.id, checkIn.session_id, checkIn.checked_at, checkIn.duration_seconds],
    );
    setPendingCheckIn(checkIn);
  }, [pendingCheckIn]);

  const completeCheckIn = useCallback(async (tagId: string | null, note: string) => {
    const current = pendingCheckIn;
    if (!current || completingRef.current) return;
    completingRef.current = true;
    try {
      await dbExecute(
        "UPDATE ch_check_ins SET skipped = $1, note = $2, synced = 0 WHERE id = $3",
        [tagId === null ? 1 : 0, note.trim(), current.id],
      );
      if (tagId) {
        await dbExecute(
          "INSERT INTO ch_check_in_entries (id, check_in_id, tag_id, percentage, synced) VALUES ($1, $2, $3, 100, 0)",
          [crypto.randomUUID(), current.id, tagId],
        );
      }
      const progress = readProgress(current.session_id);
      if (progress) saveProgress(progress.elapsedSeconds, progress.recordedSeconds + current.duration_seconds);
      setPendingCheckIn(null);
    } finally {
      completingRef.current = false;
    }
  }, [pendingCheckIn, saveProgress]);

  const endSession = useCallback(async (elapsedSeconds: number, recordedSeconds: number) => {
    const current = activeRef.current;
    if (!current) return;
    const progress = readProgress(current.id);
    const finalElapsed = progress?.elapsedSeconds ?? elapsedSeconds;
    const finalRecorded = progress?.recordedSeconds ?? recordedSeconds;
    const endedAt = new Date().toISOString();
    await dbExecute(
      "UPDATE ch_sessions SET ended_at = $1, elapsed_seconds = $2, synced = 0 WHERE id = $3",
      [endedAt, finalElapsed, current.id],
    );
    const remainder = unrecordedSeconds(finalElapsed, finalRecorded);
    if (remainder > 0) {
      await dbExecute(
        "INSERT INTO ch_check_ins (id, session_id, checked_at, skipped, note, duration_seconds, synced) VALUES ($1, $2, $3, 1, '', $4, 0)",
        [crypto.randomUUID(), current.id, endedAt, remainder],
      );
    }
    localStorage.removeItem(SESSION_PROGRESS_KEY);
    setPendingCheckIn(null);
    setActiveSession(null);
  }, []);

  return (
    <SessionContext.Provider value={{ activeSession, pendingCheckIn, loadSessions, startSession, saveProgress, createCheckIn, completeCheckIn, endSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext(): SessionState {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSessionContext must be used within SessionProvider");
  return context;
}

function readProgress(sessionId: string): StoredProgress | null {
  const raw = localStorage.getItem(SESSION_PROGRESS_KEY);
  if (!raw) return null;
  try {
    const progress = JSON.parse(raw) as StoredProgress;
    return progress.sessionId === sessionId ? progress : null;
  } catch {
    localStorage.removeItem(SESSION_PROGRESS_KEY);
    return null;
  }
}

export interface TagsState {
  tags: Tag[];
  loadTags: (userId: string) => Promise<void>;
  addTag: (name: string, color: string, userId: string) => Promise<void>;
  renameTag: (id: string, name: string) => Promise<void>;
  archiveTag: (id: string) => Promise<void>;
  activeTags: () => Tag[];
}

const TagsContext = createContext<TagsState | null>(null);

export function TagsProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const tagsRef = useRef(tags);
  tagsRef.current = tags;

  const loadTags = useCallback(async (userId: string) => {
    const rows = await dbSelect<Record<string, unknown>>(
      "SELECT * FROM ch_tags WHERE user_id = $1 ORDER BY created_at ASC",
      [userId],
    );
    setTags(rows.map((row) => ({
      id: String(row.id), user_id: String(row.user_id), name: String(row.name), color: String(row.color),
      is_archived: Boolean(row.is_archived), created_at: String(row.created_at), synced: Boolean(row.synced),
    })));
  }, []);

  const addTag = useCallback(async (name: string, color: string, userId: string) => {
    const tag: Tag = { id: crypto.randomUUID(), user_id: userId, name, color, is_archived: false, created_at: new Date().toISOString(), synced: false };
    await dbExecute(
      "INSERT INTO ch_tags (id, user_id, name, color, is_archived, created_at, synced) VALUES ($1, $2, $3, $4, 0, $5, 0)",
      [tag.id, tag.user_id, tag.name, tag.color, tag.created_at],
    );
    setTags((existing) => [...existing, tag]);
  }, []);

  const renameTag = useCallback(async (id: string, name: string) => {
    await dbExecute("UPDATE ch_tags SET name = $1, synced = 0 WHERE id = $2", [name, id]);
    setTags((existing) => existing.map((tag) => tag.id === id ? { ...tag, name, synced: false } : tag));
  }, []);

  const archiveTag = useCallback(async (id: string) => {
    await dbExecute("UPDATE ch_tags SET is_archived = 1, synced = 0 WHERE id = $1", [id]);
    setTags((existing) => existing.map((tag) => tag.id === id ? { ...tag, is_archived: true, synced: false } : tag));
  }, []);

  const activeTags = useCallback(() => tagsRef.current.filter((tag) => !tag.is_archived), []);

  return <TagsContext.Provider value={{ tags, loadTags, addTag, renameTag, archiveTag, activeTags }}>{children}</TagsContext.Provider>;
}

export function useTagsContext(): TagsState {
  const context = useContext(TagsContext);
  if (!context) throw new Error("useTagsContext must be used within TagsProvider");
  return context;
}
