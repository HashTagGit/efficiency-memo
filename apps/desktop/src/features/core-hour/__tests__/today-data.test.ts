import { beforeEach, describe, expect, it, vi } from "vitest";
import { dbExecute, dbSelect } from "../../../lib/db";
import { elapsedSecondsForDay, loadRecentActivities, loadTodaySessions, setActivityFavorite } from "../today-data";

vi.mock("../../../lib/db", () => ({
  dbExecute: vi.fn().mockResolvedValue(undefined),
  dbSelect: vi.fn().mockResolvedValue([]),
}));

describe("CoreHour Today data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes recent activities and completed sessions", async () => {
    vi.mocked(dbSelect)
      .mockResolvedValueOnce([{
        activity: "Write release notes",
        default_tag_id: "tag-1",
        tag_name: "Deep work",
        tag_color: "#d6a24a",
        is_favorite: 1,
        last_used_at: "2026-08-27T09:00:00.000Z",
      }])
      .mockResolvedValueOnce([{
        id: "session-1",
        activity: "Write release notes",
        started_at: "2026-08-27T09:00:00.000Z",
        ended_at: "2026-08-27T10:00:00.000Z",
        elapsed_seconds: 3600,
        default_tag_id: "tag-1",
        tag_name: "Deep work",
        tag_color: "#d6a24a",
        is_favorite: 0,
      }]);

    const recent = await loadRecentActivities("local-user");
    const today = await loadTodaySessions("local-user");

    expect(recent[0]).toMatchObject({ activity: "Write release notes", is_favorite: true });
    expect(today[0]).toMatchObject({ id: "session-1", elapsed_seconds: 3600, is_favorite: false });
  });

  it("updates favorite state for the matching activity and tag", async () => {
    await setActivityFavorite("local-user", "Write release notes", "tag-1", true);

    expect(dbExecute).toHaveBeenCalledOnce();
    expect(vi.mocked(dbExecute).mock.calls[0]?.[1]).toEqual([1, "local-user", "Write release notes", "tag-1"]);
  });

  it("clamps a cross-midnight session to today's wall-clock overlap", async () => {
    const noon = new Date(2026, 7, 27, 12);
    const midnight = new Date(2026, 7, 27, 0);
    vi.mocked(dbSelect).mockResolvedValueOnce([{
      id: "session-2",
      activity: "Late work",
      started_at: new Date(midnight.getTime() - 30 * 60 * 1000).toISOString(),
      ended_at: new Date(midnight.getTime() + 30 * 60 * 1000).toISOString(),
      elapsed_seconds: 1800,
      default_tag_id: null,
      tag_name: null,
      tag_color: null,
      is_favorite: 0,
    }]);

    const sessions = await loadTodaySessions("local-user", noon);

    expect(sessions[0]?.elapsed_seconds).toBe(900);
  });

  it("prorates active elapsed time across local midnight", () => {
    const midnight = new Date(2026, 7, 27, 0);
    const now = new Date(midnight.getTime() + 30 * 60 * 1000);

    expect(elapsedSecondsForDay(
      new Date(midnight.getTime() - 30 * 60 * 1000).toISOString(),
      now,
      1800,
      now,
    )).toBe(900);
  });
});
