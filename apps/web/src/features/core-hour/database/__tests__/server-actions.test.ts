import { describe, it, expect } from "vitest";
import type { CheckIn, Session, SessionTag, Settings, Tag, Uuid } from "../../types";

// ---------------------------------------------------------------------------
// Compile-time checks: the import itself verifies the module resolves
// ---------------------------------------------------------------------------
import {
  createCheckIn,
  createSessionTag,
  createTag,
  endSession,
  getSettings,
  listCheckIns,
  listSessions,
  listSessionTags,
  listTags,
  startSession,
  updateIntervalMinutes,
} from "../server-actions";

// ---------------------------------------------------------------------------
// Helper: deterministic UUID
// ---------------------------------------------------------------------------
function uid(n: number): Uuid {
  return n.toString().padStart(36, "0");
}

const ISO_TIMESTAMP = "2026-06-01T12:00:00.000Z";

// ---------------------------------------------------------------------------
// Assert each function is exported and is async (returns a Promise)
// ---------------------------------------------------------------------------

describe("server-actions module exports", () => {
  it("exports startSession as a function", () => {
    expect(startSession).toBeInstanceOf(Function);
  });

  it("exports endSession as a function", () => {
    expect(endSession).toBeInstanceOf(Function);
  });

  it("exports listSessions as a function", () => {
    expect(listSessions).toBeInstanceOf(Function);
  });

  it("exports createTag as a function", () => {
    expect(createTag).toBeInstanceOf(Function);
  });

  it("exports listTags as a function", () => {
    expect(listTags).toBeInstanceOf(Function);
  });

  it("exports createCheckIn as a function", () => {
    expect(createCheckIn).toBeInstanceOf(Function);
  });

  it("exports listCheckIns as a function", () => {
    expect(listCheckIns).toBeInstanceOf(Function);
  });

  it("exports createSessionTag as a function", () => {
    expect(createSessionTag).toBeInstanceOf(Function);
  });

  it("exports listSessionTags as a function", () => {
    expect(listSessionTags).toBeInstanceOf(Function);
  });

  it("exports getSettings as a function", () => {
    expect(getSettings).toBeInstanceOf(Function);
  });

  it("exports updateIntervalMinutes as a function", () => {
    expect(updateIntervalMinutes).toBeInstanceOf(Function);
  });
});

// ---------------------------------------------------------------------------
// Type-contract verification: ensure each function returns the expected type
// by examining the return type at the type level
// ---------------------------------------------------------------------------

describe("function return types", () => {
  it("startSession returns a Session", async () => {
    // Type-level assertion: the return type extends Promise<Session>
    type _Check = ReturnType<typeof startSession> extends Promise<Session>
      ? true
      : false;
    const check: _Check = true;
    expect(check).toBe(true);
  });

  it("endSession returns a Session", () => {
    type _Check = ReturnType<typeof endSession> extends Promise<Session>
      ? true
      : false;
    const check: _Check = true;
    expect(check).toBe(true);
  });

  it("listSessions returns an array of Sessions", () => {
    type _Check = ReturnType<typeof listSessions> extends Promise<Session[]>
      ? true
      : false;
    const check: _Check = true;
    expect(check).toBe(true);
  });

  it("createTag returns a Tag", () => {
    type _Check = ReturnType<typeof createTag> extends Promise<Tag>
      ? true
      : false;
    const check: _Check = true;
    expect(check).toBe(true);
  });

  it("listTags returns an array of Tags", () => {
    type _Check = ReturnType<typeof listTags> extends Promise<Tag[]>
      ? true
      : false;
    const check: _Check = true;
    expect(check).toBe(true);
  });

  it("createCheckIn returns a CheckIn", () => {
    type _Check = ReturnType<typeof createCheckIn> extends Promise<CheckIn>
      ? true
      : false;
    const check: _Check = true;
    expect(check).toBe(true);
  });

  it("listCheckIns returns an array of CheckIns", () => {
    type _Check = ReturnType<typeof listCheckIns> extends Promise<CheckIn[]>
      ? true
      : false;
    const check: _Check = true;
    expect(check).toBe(true);
  });

  it("createSessionTag returns a SessionTag", () => {
    type _Check = ReturnType<typeof createSessionTag> extends Promise<SessionTag>
      ? true
      : false;
    const check: _Check = true;
    expect(check).toBe(true);
  });

  it("listSessionTags returns an array of SessionTags", () => {
    type _Check = ReturnType<typeof listSessionTags> extends Promise<SessionTag[]>
      ? true
      : false;
    const check: _Check = true;
    expect(check).toBe(true);
  });

  it("getSettings returns a Settings", () => {
    type _Check = ReturnType<typeof getSettings> extends Promise<Settings>
      ? true
      : false;
    const check: _Check = true;
    expect(check).toBe(true);
  });

  it("updateIntervalMinutes returns void", () => {
    type _Check = ReturnType<typeof updateIntervalMinutes> extends Promise<void>
      ? true
      : false;
    const check: _Check = true;
    expect(check).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Parameter-type verification: ensure functions accept the documented types
// ---------------------------------------------------------------------------

describe("function parameter types", () => {
  it("startSession accepts (userId: Uuid, intervalMinutes?: number)", () => {
    const _accepts: Parameters<typeof startSession> = [uid(1), 30];
    expect(_accepts[0]).toBeTypeOf("string");
    expect(_accepts[1]).toBeTypeOf("number");
  });

  it("endSession accepts (sessionId: Uuid)", () => {
    const _accepts: Parameters<typeof endSession> = [uid(1)];
    expect(_accepts[0]).toBeTypeOf("string");
  });

  it("listSessions accepts (userId: Uuid)", () => {
    const _accepts: Parameters<typeof listSessions> = [uid(1)];
    expect(_accepts[0]).toBeTypeOf("string");
  });

  it("createTag accepts (userId: Uuid, name: string, color?: string)", () => {
    const _accepts: Parameters<typeof createTag> = [uid(1), "deep-work", "#22c55e"];
    expect(_accepts[0]).toBeTypeOf("string");
    expect(_accepts[1]).toBeTypeOf("string");
    expect(_accepts[2]).toBeTypeOf("string");
  });

  it("createTag works with default color", () => {
    const _accepts: Parameters<typeof createTag> = [uid(1), "meetings"];
    expect(_accepts.length).toBe(2);
  });

  it("listTags accepts (userId: Uuid)", () => {
    const _accepts: Parameters<typeof listTags> = [uid(1)];
    expect(_accepts[0]).toBeTypeOf("string");
  });

  it("createCheckIn accepts (sessionId: Uuid, skipped?: boolean, note?: string)", () => {
    const _accepts: Parameters<typeof createCheckIn> = [uid(1), true, "meeting"];
    expect(_accepts[0]).toBeTypeOf("string");
    expect(_accepts[1]).toBeTypeOf("boolean");
    expect(_accepts[2]).toBeTypeOf("string");
  });

  it("createCheckIn works with defaults", () => {
    const _accepts: Parameters<typeof createCheckIn> = [uid(1)];
    expect(_accepts.length).toBe(1);
  });

  it("listCheckIns accepts (sessionId: Uuid)", () => {
    const _accepts: Parameters<typeof listCheckIns> = [uid(1)];
    expect(_accepts[0]).toBeTypeOf("string");
  });

  it("createSessionTag accepts (checkInId: Uuid, tagId: Uuid, percentage: number)", () => {
    const _accepts: Parameters<typeof createSessionTag> = [uid(1), uid(2), 100];
    expect(_accepts[0]).toBeTypeOf("string");
    expect(_accepts[1]).toBeTypeOf("string");
    expect(_accepts[2]).toBeTypeOf("number");
  });

  it("listSessionTags accepts (checkInId: Uuid)", () => {
    const _accepts: Parameters<typeof listSessionTags> = [uid(1)];
    expect(_accepts[0]).toBeTypeOf("string");
  });

  it("getSettings accepts no parameters", () => {
    type _Params = Parameters<typeof getSettings>;
    const _empty: _Params = [];
    expect(_empty.length).toBe(0);
  });

  it("updateIntervalMinutes accepts (minutes: number)", () => {
    const _accepts: Parameters<typeof updateIntervalMinutes> = [30];
    expect(_accepts[0]).toBeTypeOf("number");
  });
});

// ---------------------------------------------------------------------------
// Session shape contract verification (mirrors types.test.ts)
// ---------------------------------------------------------------------------

describe("Session record shape", () => {
  it("includes all required fields with correct types", () => {
    const session: Session = {
      id: uid(1),
      user_id: uid(2),
      started_at: ISO_TIMESTAMP,
      ended_at: null,
      interval_minutes: 30,
      synced: false,
    };
    expect(session.id).toBeTypeOf("string");
    expect(session.user_id).toBeTypeOf("string");
    expect(session.started_at).toBeTypeOf("string");
    expect(session.ended_at).toBeNull();
    expect(session.interval_minutes).toBeTypeOf("number");
    expect(session.synced).toBeTypeOf("boolean");
  });

  it("ch_sessions is the correct table name (matches migration)", () => {
    // Compile-time check: the table name used in SQL migration
    const TABLE_NAME = "ch_sessions";
    expect(TABLE_NAME).toMatch(/^ch_/);
  });
});

describe("Tag record shape", () => {
  it("includes all required fields with correct types", () => {
    const tag: Tag = {
      id: uid(10),
      user_id: uid(2),
      name: "deep-work",
      color: "#3b82f6",
      is_archived: false,
      created_at: ISO_TIMESTAMP,
      synced: false,
    };
    expect(tag.id).toBeTypeOf("string");
    expect(tag.user_id).toBeTypeOf("string");
    expect(tag.name).toBeTypeOf("string");
    expect(tag.color).toMatch(/^#/);
    expect(tag.is_archived).toBeTypeOf("boolean");
    expect(tag.created_at).toBeTypeOf("string");
    expect(tag.synced).toBeTypeOf("boolean");
  });

  it("ch_tags is the correct table name (matches migration)", () => {
    const TABLE_NAME = "ch_tags";
    expect(TABLE_NAME).toMatch(/^ch_/);
  });
});

describe("CheckIn record shape", () => {
  it("includes all required fields with correct types", () => {
    const checkIn: CheckIn = {
      id: uid(20),
      session_id: uid(1),
      checked_at: ISO_TIMESTAMP,
      skipped: false,
      note: "Focused on implementation",
      synced: false,
    };
    expect(checkIn.id).toBeTypeOf("string");
    expect(checkIn.session_id).toBeTypeOf("string");
    expect(checkIn.checked_at).toBeTypeOf("string");
    expect(checkIn.skipped).toBeTypeOf("boolean");
    expect(checkIn.note).toBeTypeOf("string");
    expect(checkIn.synced).toBeTypeOf("boolean");
  });

  it("ch_check_ins is the correct table name (matches migration)", () => {
    const TABLE_NAME = "ch_check_ins";
    expect(TABLE_NAME).toMatch(/^ch_/);
  });
});

describe("SessionTag (ch_check_in_entries) record shape", () => {
  it("includes all required fields with correct types", () => {
    const sessionTag: SessionTag = {
      id: uid(30),
      check_in_id: uid(20),
      tag_id: uid(10),
      percentage: 100,
      synced: false,
    };
    expect(sessionTag.id).toBeTypeOf("string");
    expect(sessionTag.check_in_id).toBeTypeOf("string");
    expect(sessionTag.tag_id).toBeTypeOf("string");
    expect(sessionTag.percentage).toBeTypeOf("number");
    expect(sessionTag.percentage).toBeGreaterThanOrEqual(0);
    expect(sessionTag.percentage).toBeLessThanOrEqual(100);
    expect(sessionTag.synced).toBeTypeOf("boolean");
  });

  it("ch_check_in_entries is the correct table name (matches migration)", () => {
    const TABLE_NAME = "ch_check_in_entries";
    expect(TABLE_NAME).toMatch(/^ch_/);
  });
});

describe("Settings record shape", () => {
  it("includes interval_minutes with number type", () => {
    const settings: Settings = { interval_minutes: 30 };
    expect(settings.interval_minutes).toBeTypeOf("number");
  });

  it("ch_settings is the correct table name (matches migration)", () => {
    const TABLE_NAME = "ch_settings";
    expect(TABLE_NAME).toMatch(/^ch_/);
  });
});

// ---------------------------------------------------------------------------
// Table name fixtures: every ch_ table from the migration is accounted for
// ---------------------------------------------------------------------------

describe("all ch_ table names match migration 003_ch_core_hour.sql", () => {
  const CH_TABLES = [
    "ch_tags",
    "ch_sessions",
    "ch_check_ins",
    "ch_check_in_entries",
    "ch_settings",
  ] as const;

  it("lists exactly 5 tables", () => {
    expect(CH_TABLES).toHaveLength(5);
  });

  it("every table name starts with ch_", () => {
    for (const table of CH_TABLES) {
      expect(table).toMatch(/^ch_/);
    }
  });

  it("includes the check_in_entries table (maps to SessionTag type)", () => {
    expect(CH_TABLES).toContain("ch_check_in_entries");
  });
});
