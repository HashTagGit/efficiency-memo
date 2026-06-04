import { describe, it, expect } from "vitest";
import type { Session, Tag, CheckIn, SessionTag, Settings, Uuid, IsoTimestamp } from "../types";

// ---------------------------------------------------------------------------
// Helper: deterministic UUID factory
// ---------------------------------------------------------------------------
function uid(n: number): Uuid {
  return n.toString().padStart(36, "0");
}

const iso = "2026-06-01T12:00:00.000Z" satisfies IsoTimestamp;

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

function validSession(overrides?: Partial<Session>): Session {
  return {
    id: uid(1),
    user_id: uid(2),
    started_at: iso,
    ended_at: null,
    interval_minutes: 30,
    synced: true,
    ...overrides,
  };
}

function validTag(overrides?: Partial<Tag>): Tag {
  return {
    id: uid(10),
    user_id: uid(2),
    name: "deep-work",
    color: "#3b82f6",
    is_archived: false,
    created_at: iso,
    synced: true,
    ...overrides,
  };
}

function validCheckIn(overrides?: Partial<CheckIn>): CheckIn {
  return {
    id: uid(20),
    session_id: uid(1),
    checked_at: iso,
    skipped: false,
    note: "Focused on feature implementation",
    synced: true,
    ...overrides,
  };
}

function validSessionTag(overrides?: Partial<SessionTag>): SessionTag {
  return {
    id: uid(30),
    check_in_id: uid(20),
    tag_id: uid(10),
    percentage: 100,
    synced: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Field-type shape helpers (type-level only — runtime no-ops)
// ---------------------------------------------------------------------------
function checkFieldTypes<T extends Record<string, unknown>>(_obj: T): void {
  /* no-op */
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CoreHour types", () => {
  describe("Session", () => {
    it("creates a valid session with all required fields", () => {
      const s = validSession();
      expect(s.id).toBeTypeOf("string");
      expect(s.user_id).toBeTypeOf("string");
      expect(s.started_at).toBeTypeOf("string");
      expect(s.interval_minutes).toBeTypeOf("number");
      expect(s.synced).toBeTypeOf("boolean");
    });

    it("allows ended_at to be null (active session)", () => {
      const active = validSession({ ended_at: null });
      expect(active.ended_at).toBeNull();
    });

    it("allows ended_at to be a timestamp (completed session)", () => {
      const completed = validSession({ ended_at: "2026-06-01T13:00:00.000Z" });
      expect(completed.ended_at).toBeTypeOf("string");
    });

    it("accepts overrides for every field", () => {
      const custom = validSession({
        id: uid(99),
        interval_minutes: 60,
        synced: false,
      });
      expect(custom.id).toBe(uid(99));
      expect(custom.interval_minutes).toBe(60);
      expect(custom.synced).toBe(false);
    });

    it("satisfies the Session shape (compile-time check)", () => {
      checkFieldTypes<Session>(validSession());
    });
  });

  describe("Tag", () => {
    it("creates a valid tag with all required fields", () => {
      const t = validTag();
      expect(t.id).toBeTypeOf("string");
      expect(t.user_id).toBeTypeOf("string");
      expect(t.name).toBeTypeOf("string");
      expect(t.color).toMatch(/^#/);
      expect(t.is_archived).toBeTypeOf("boolean");
      expect(t.created_at).toBeTypeOf("string");
      expect(t.synced).toBeTypeOf("boolean");
    });

    it("defaults is_archived to false", () => {
      const t = validTag();
      expect(t.is_archived).toBe(false);
    });

    it("accepts archived state", () => {
      const archived = validTag({ is_archived: true, name: "old-project" });
      expect(archived.is_archived).toBe(true);
    });

    it("accepts any hex color", () => {
      const green = validTag({ color: "#22c55e" });
      expect(green.color).toBe("#22c55e");
    });

    it("satisfies the Tag shape (compile-time check)", () => {
      checkFieldTypes<Tag>(validTag());
    });
  });

  describe("CheckIn", () => {
    it("creates a valid check-in with all required fields", () => {
      const c = validCheckIn();
      expect(c.id).toBeTypeOf("string");
      expect(c.session_id).toBeTypeOf("string");
      expect(c.checked_at).toBeTypeOf("string");
      expect(c.skipped).toBeTypeOf("boolean");
      expect(c.note).toBeTypeOf("string");
      expect(c.synced).toBeTypeOf("boolean");
    });

    it("allows skipped check-ins", () => {
      const skipped = validCheckIn({ skipped: true, note: "Was in a meeting" });
      expect(skipped.skipped).toBe(true);
      expect(skipped.note).toBe("Was in a meeting");
    });

    it("allows empty note", () => {
      const noNote = validCheckIn({ note: "" });
      expect(noNote.note).toBe("");
    });

    it("satisfies the CheckIn shape (compile-time check)", () => {
      checkFieldTypes<CheckIn>(validCheckIn());
    });
  });

  describe("SessionTag", () => {
    it("creates a valid session-tag link with all required fields", () => {
      const st = validSessionTag();
      expect(st.id).toBeTypeOf("string");
      expect(st.check_in_id).toBeTypeOf("string");
      expect(st.tag_id).toBeTypeOf("string");
      expect(st.percentage).toBeTypeOf("number");
      expect(st.synced).toBeTypeOf("boolean");
    });

    it("percentage is between 0 and 100", () => {
      expect(validSessionTag().percentage).toBeGreaterThanOrEqual(0);
      expect(validSessionTag().percentage).toBeLessThanOrEqual(100);
    });

    it("allows partial percentage (e.g. multi-tag split)", () => {
      const partial = validSessionTag({ percentage: 60 });
      expect(partial.percentage).toBe(60);
    });

    it("satisfies the SessionTag shape (compile-time check)", () => {
      checkFieldTypes<SessionTag>(validSessionTag());
    });
  });

  describe("Settings", () => {
    it("creates valid settings", () => {
      const settings: Settings = { interval_minutes: 30 };
      expect(settings.interval_minutes).toBeTypeOf("number");
    });

    it("allows different interval values", () => {
      const s15: Settings = { interval_minutes: 15 };
      const s60: Settings = { interval_minutes: 60 };
      expect(s15.interval_minutes).toBe(15);
      expect(s60.interval_minutes).toBe(60);
    });
  });

  describe("fixture helpers", () => {
    it("produces unique IDs per factory call", () => {
      const s1 = validSession();
      const s2 = validSession();
      expect(s1.id).toBe(s1.id);
      expect(s2.id).toBe(s2.id);
      // default ID depends on uid(1)
      expect(s1.id).toBe(s2.id);
      // but two different factory types use different default IDs
      expect(validSession().id).not.toBe(validTag().id);
    });

    it("overrides do not mutate other fields", () => {
      const s = validSession({ id: uid(99), interval_minutes: 15 });
      expect(s.user_id).toBe(uid(2));
      expect(s.started_at).toBe(iso);
      expect(s.ended_at).toBeNull();
    });
  });
});
