// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CheckIn, Session, SessionTag, Tag } from "../../types";
import { createIntegrationDatabase } from "../test-database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface UserRecord {
  id: string;
}

function toIsoString(value: Date | string | null) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let harness: Awaited<ReturnType<typeof createIntegrationDatabase>>;

beforeEach(async () => {
  harness = await createIntegrationDatabase();
});

afterEach(async () => {
  if (harness) {
    await harness.pool.end();
  }
});

// ---------------------------------------------------------------------------
// Test factories
// ---------------------------------------------------------------------------

async function insertUser() {
  const result = await harness.pool.query<UserRecord>(
    `insert into auth.users (id) values (gen_random_uuid()) returning *`,
  );

  return result.rows[0];
}

async function insertSession(
  userId: string,
  overrides: Partial<Pick<Session, "started_at" | "interval_minutes">> = {},
) {
  const result = await harness.pool.query<Session>(
    `insert into ch_sessions (user_id, started_at, interval_minutes)
     values ($1, $2, $3) returning *`,
    [
      userId,
      overrides.started_at ?? "2026-04-01T08:00:00Z",
      overrides.interval_minutes ?? 30,
    ],
  );

  return result.rows[0];
}

async function insertTag(
  userId: string,
  overrides: Partial<Pick<Tag, "name" | "color">> = {},
) {
  const result = await harness.pool.query<Tag>(
    `insert into ch_tags (user_id, name, color)
     values ($1, $2, $3) returning *`,
    [userId, overrides.name ?? "Focus", overrides.color ?? "#3b82f6"],
  );

  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CH database schema migrations", () => {
  // ---- Session CRUD -------------------------------------------------------

  it("creates and reads a session", async () => {
    const user = await insertUser();
    const session = await insertSession(user.id, {
      started_at: "2026-04-01T09:00:00Z",
      interval_minutes: 25,
    });

    expect(session.user_id).toBe(user.id);
    expect(session.interval_minutes).toBe(25);
    expect(toIsoString(session.started_at)).toBe(
      "2026-04-01T09:00:00.000Z",
    );
    expect(session.ended_at).toBeNull();
  });

  it("ends a session by setting ended_at", async () => {
    const user = await insertUser();
    const session = await insertSession(user.id);

    expect(session.ended_at).toBeNull();

    const result = await harness.pool.query<Session>(
      `update ch_sessions set ended_at = $2 where id = $1 returning *`,
      [session.id, "2026-04-01T11:00:00Z"],
    );

    expect(toIsoString(result.rows[0].ended_at)).toBe(
      "2026-04-01T11:00:00.000Z",
    );
  });

  // ---- Tag CRUD -----------------------------------------------------------

  it("creates tags with different colours", async () => {
    const user = await insertUser();
    await insertTag(user.id, { name: "Deep Work", color: "#ef4444" });
    await insertTag(user.id, { name: "Meetings", color: "#f59e0b" });
    await insertTag(user.id, { name: "Learning", color: "#10b981" });

    const result = await harness.pool.query<Tag>(
      `select * from ch_tags where user_id = $1 order by name asc`,
      [user.id],
    );

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].name).toBe("Deep Work");
    expect(result.rows[1].name).toBe("Learning");
    expect(result.rows[2].name).toBe("Meetings");
  });

  it("archives a tag", async () => {
    const user = await insertUser();
    const tag = await insertTag(user.id, { name: "Archivable" });

    expect(tag.is_archived).toBe(false);

    const result = await harness.pool.query<Tag>(
      `update ch_tags set is_archived = true where id = $1 returning *`,
      [tag.id],
    );

    expect(result.rows[0].is_archived).toBe(true);
  });

  // ---- Check-in logging ---------------------------------------------------

  it("logs a check-in for a session", async () => {
    const user = await insertUser();
    const session = await insertSession(user.id);

    const result = await harness.pool.query<CheckIn>(
      `insert into ch_check_ins (session_id, checked_at, note)
       values ($1, $2, $3) returning *`,
      [session.id, "2026-04-01T09:30:00Z", "Working on feature X"],
    );

    expect(result.rows[0]).toMatchObject({
      session_id: session.id,
      note: "Working on feature X",
      skipped: false,
    });
    expect(toIsoString(result.rows[0].checked_at)).toBe(
      "2026-04-01T09:30:00.000Z",
    );
  });

  it("creates check-in entries with percentage allocations", async () => {
    const user = await insertUser();
    const session = await insertSession(user.id);
    const coding = await insertTag(user.id, { name: "Coding" });
    const research = await insertTag(user.id, { name: "Research" });

    const checkIn = await harness.pool.query<CheckIn>(
      `insert into ch_check_ins (session_id, checked_at, note)
       values ($1, $2, $3) returning *`,
      [session.id, "2026-04-01T10:00:00Z", "Mid-morning check"],
    );

    await harness.pool.query(
      `insert into ch_check_in_entries (check_in_id, tag_id, percentage)
       values ($1, $2, $3)`,
      [checkIn.rows[0].id, coding.id, 70],
    );
    await harness.pool.query(
      `insert into ch_check_in_entries (check_in_id, tag_id, percentage)
       values ($1, $2, $3)`,
      [checkIn.rows[0].id, research.id, 30],
    );

    const result = await harness.pool.query<
      { tag_name: string; percentage: number }
    >(
      `select t.name as tag_name, e.percentage
       from ch_check_in_entries e
       join ch_tags t on t.id = e.tag_id
       where e.check_in_id = $1
       order by e.percentage desc`,
      [checkIn.rows[0].id],
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].tag_name).toBe("Coding");
    expect(result.rows[0].percentage).toBe(70);
    expect(result.rows[1].tag_name).toBe("Research");
    expect(result.rows[1].percentage).toBe(30);
  });

  // ---- FK constraints -----------------------------------------------------

  it("rejects check-in referencing a non-existent session", async () => {
    await expect(
      harness.pool.query(
        `insert into ch_check_ins (session_id, checked_at)
         values ($1, $2)`,
        [
          "00000000-0000-0000-0000-000000000000",
          "2026-04-01T09:00:00Z",
        ],
      ),
    ).rejects.toThrow();
  });

  // ---- Cascading deletes --------------------------------------------------

  it("cascades delete from session to check-ins and entries", async () => {
    const user = await insertUser();
    const session = await insertSession(user.id);
    const tag = await insertTag(user.id);

    const ci = await harness.pool.query<CheckIn>(
      `insert into ch_check_ins (session_id, checked_at)
       values ($1, $2) returning *`,
      [session.id, "2026-04-01T09:30:00Z"],
    );
    await harness.pool.query(
      `insert into ch_check_in_entries (check_in_id, tag_id, percentage)
       values ($1, $2, $3)`,
      [ci.rows[0].id, tag.id, 100],
    );

    await harness.pool.query(
      `delete from ch_sessions where id = $1`,
      [session.id],
    );

    const checkins = await harness.pool.query<{ n: number }>(
      `select count(*)::int as n from ch_check_ins`,
    );
    const entries = await harness.pool.query<{ n: number }>(
      `select count(*)::int as n from ch_check_in_entries`,
    );

    expect(checkins.rows[0].n).toBe(0);
    expect(entries.rows[0].n).toBe(0);
  });

  it("cascades delete from tag to check-in entries only", async () => {
    const user = await insertUser();
    const session = await insertSession(user.id);
    const tag = await insertTag(user.id);

    const ci = await harness.pool.query<CheckIn>(
      `insert into ch_check_ins (session_id, checked_at)
       values ($1, $2) returning *`,
      [session.id, "2026-04-01T09:30:00Z"],
    );
    await harness.pool.query(
      `insert into ch_check_in_entries (check_in_id, tag_id, percentage)
       values ($1, $2, $3)`,
      [ci.rows[0].id, tag.id, 100],
    );

    // Delete tag — should cascade to entries but NOT to the check-in itself
    await harness.pool.query(
      `delete from ch_tags where id = $1`,
      [tag.id],
    );

    const entries = await harness.pool.query<{ n: number }>(
      `select count(*)::int as n from ch_check_in_entries`,
    );
    const checkins = await harness.pool.query<{ n: number }>(
      `select count(*)::int as n from ch_check_ins`,
    );

    expect(entries.rows[0].n).toBe(0);
    expect(checkins.rows[0].n).toBe(1);
  });

  // ---- Settings -----------------------------------------------------------

  it("manages the settings key-value store", async () => {
    // Seed default from migration
    const seed = await harness.pool.query<{ value: string }>(
      `select value from ch_settings where key = 'interval_minutes'`,
    );
    expect(seed.rows[0].value).toBe("30");

    // Update
    await harness.pool.query(
      `update ch_settings set value = '45' where key = $1`,
      ["interval_minutes"],
    );

    // Insert new key
    await harness.pool.query(
      `insert into ch_settings (key, value) values ($1, $2)`,
      ["theme", "dark"],
    );

    // Verify both
    const all = await harness.pool.query<{ key: string; value: string }>(
      `select * from ch_settings order by key`,
    );

    expect(all.rows).toHaveLength(2);
    expect(all.rows.find((r) => r.key === "interval_minutes")?.value).toBe(
      "45",
    );
    expect(all.rows.find((r) => r.key === "theme")?.value).toBe("dark");
  });

  // ---- Many-to-many (session <-> tag via check-in entries) ----------------

  it("queries session with tag allocations (many-to-many)", async () => {
    const user = await insertUser();
    const session = await insertSession(user.id, { interval_minutes: 60 });
    const design = await insertTag(user.id, {
      name: "Design",
      color: "#8b5cf6",
    });
    const dev = await insertTag(user.id, { name: "Dev", color: "#3b82f6" });

    // First check-in: 60 % Design, 40 % Dev
    const ci1 = await harness.pool.query<CheckIn>(
      `insert into ch_check_ins (session_id, checked_at, note)
       values ($1, $2, $3) returning *`,
      [session.id, "2026-04-01T14:30:00Z", "After design sprint"],
    );
    await harness.pool.query(
      `insert into ch_check_in_entries (check_in_id, tag_id, percentage)
       values ($1, $2, $3)`,
      [ci1.rows[0].id, design.id, 60],
    );
    await harness.pool.query(
      `insert into ch_check_in_entries (check_in_id, tag_id, percentage)
       values ($1, $2, $3)`,
      [ci1.rows[0].id, dev.id, 40],
    );

    // Second check-in: 100 % Dev
    const ci2 = await harness.pool.query<CheckIn>(
      `insert into ch_check_ins (session_id, checked_at, note)
       values ($1, $2, $3) returning *`,
      [session.id, "2026-04-01T15:30:00Z", "Deep in code"],
    );
    await harness.pool.query(
      `insert into ch_check_in_entries (check_in_id, tag_id, percentage)
       values ($1, $2, $3)`,
      [ci2.rows[0].id, dev.id, 100],
    );

    // Query: all check-ins for session with tag breakdown
    const result = await harness.pool.query<
      {
        check_in_id: string;
        checked_at: string;
        tag_name: string;
        percentage: number;
      }
    >(
      `select ci.id as check_in_id,
              ci.checked_at,
              t.name as tag_name,
              e.percentage
       from ch_check_ins ci
       join ch_check_in_entries e on e.check_in_id = ci.id
       join ch_tags t on t.id = e.tag_id
       where ci.session_id = $1
       order by ci.checked_at asc, e.percentage desc`,
      [session.id],
    );

    expect(result.rows).toHaveLength(3);
    // First check-in: Design 60 %, Dev 40 %
    expect(result.rows[0].tag_name).toBe("Design");
    expect(result.rows[0].percentage).toBe(60);
    expect(result.rows[1].tag_name).toBe("Dev");
    expect(result.rows[1].percentage).toBe(40);
    // Second check-in: Dev 100 %
    expect(result.rows[2].tag_name).toBe("Dev");
    expect(result.rows[2].percentage).toBe(100);
  });
});
