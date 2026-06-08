import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { Session, Tag } from "../types";
import { dbSelect, dbExecute } from "../../../lib/db";

/* ─────────────────────────────────────────────────────────────────────────────
 * Session Context
 * ────────────────────────────────────────────────────────────────────────────*/

export interface SessionState {
  activeSession: Session | null;
  sessions: Session[];
  loadSessions: (userId: string) => Promise<void>;
  startSession: (userId: string, intervalMinutes: number) => Promise<void>;
  endSession: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Ref to always read the latest activeSession without deps churn
  const activeRef = useRef(activeSession);
  activeRef.current = activeSession;

  const loadSessions = useCallback(async (userId: string) => {
    const rows = await dbSelect<Record<string, unknown>>(
      "SELECT * FROM ch_sessions WHERE user_id = $1 ORDER BY started_at DESC",
      [userId],
    );
    const mapped = rows.map(
      (r: Record<string, unknown>) =>
        ({
          id: r.id,
          user_id: r.user_id,
          started_at: r.started_at,
          ended_at: r.ended_at,
          interval_minutes: r.interval_minutes,
          synced: Boolean(r.synced),
        }) as unknown as Session,
    );
    const active = mapped.find((s: Session) => s.ended_at === null) ?? null;
    setSessions(mapped);
    setActiveSession(active);
  }, []);

  const startSession = useCallback(
    async (userId: string, intervalMinutes: number) => {
      const session: Session = {
        id: crypto.randomUUID(),
        user_id: userId,
        started_at: new Date().toISOString(),
        ended_at: null,
        interval_minutes: intervalMinutes,
        synced: false,
      };
      await dbExecute(
        "INSERT INTO ch_sessions (id, user_id, started_at, ended_at, interval_minutes, synced) VALUES ($1, $2, $3, NULL, $4, 0)",
        [session.id, session.user_id, session.started_at, session.interval_minutes],
      );
      setActiveSession(session);
      setSessions((prev) => [session, ...prev]);
    },
    [],
  );

  const endSession = useCallback(async () => {
    const cur = activeRef.current;
    if (!cur) return;
    const ended_at = new Date().toISOString();
    await dbExecute(
      "UPDATE ch_sessions SET ended_at = $1, synced = 0 WHERE id = $2",
      [ended_at, cur.id],
    );
    setActiveSession(null);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === cur.id ? { ...s, ended_at, synced: false } : s,
      ),
    );
  }, []);

  return (
    <SessionContext.Provider
      value={{ activeSession, sessions, loadSessions, startSession, endSession }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSessionContext must be used within SessionProvider");
  return ctx;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Tags Context
 * ────────────────────────────────────────────────────────────────────────────*/

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

  // Ref for latest tags so activeTags() is always fresh
  const tagsRef = useRef(tags);
  tagsRef.current = tags;

  const loadTags = useCallback(async (userId: string) => {
    const rows = await dbSelect<Record<string, unknown>>(
      "SELECT * FROM ch_tags WHERE user_id = $1 ORDER BY created_at ASC",
      [userId],
    );
    setTags(
      rows.map(
        (r: Record<string, unknown>) =>
          ({
            id: r.id,
            user_id: r.user_id,
            name: r.name,
            color: r.color,
            is_archived: Boolean(r.is_archived),
            created_at: r.created_at,
            synced: Boolean(r.synced),
          }) as unknown as Tag,
      ),
    );
  }, []);

  const addTag = useCallback(
    async (name: string, color: string, userId: string) => {
      const tag: Tag = {
        id: crypto.randomUUID(),
        user_id: userId,
        name,
        color,
        is_archived: false,
        created_at: new Date().toISOString(),
        synced: false,
      };
      await dbExecute(
        "INSERT INTO ch_tags (id, user_id, name, color, is_archived, created_at, synced) VALUES ($1, $2, $3, $4, 0, $5, 0)",
        [tag.id, tag.user_id, tag.name, tag.color, tag.created_at],
      );
      setTags((prev) => [...prev, tag]);
    },
    [],
  );

  const renameTag = useCallback(async (id: string, name: string) => {
    await dbExecute("UPDATE ch_tags SET name = $1, synced = 0 WHERE id = $2", [
      name,
      id,
    ]);
    setTags((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name, synced: false } : t)),
    );
  }, []);

  const archiveTag = useCallback(async (id: string) => {
    await dbExecute(
      "UPDATE ch_tags SET is_archived = 1, synced = 0 WHERE id = $1",
      [id],
    );
    setTags((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, is_archived: true, synced: false } : t,
      ),
    );
  }, []);

  const activeTags = useCallback(() => {
    return tagsRef.current.filter((t) => !t.is_archived);
  }, []);

  return (
    <TagsContext.Provider
      value={{ tags, loadTags, addTag, renameTag, archiveTag, activeTags }}
    >
      {children}
    </TagsContext.Provider>
  );
}

export function useTagsContext(): TagsState {
  const ctx = useContext(TagsContext);
  if (!ctx) throw new Error("useTagsContext must be used within TagsProvider");
  return ctx;
}
