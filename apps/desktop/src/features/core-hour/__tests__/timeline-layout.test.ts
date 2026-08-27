import { describe, expect, it } from "vitest";
import {
  TIMELINE_BOUNDS,
  layoutTimelineSessions,
  snapTimelineMinute,
} from "../timeline-layout";
import type { TodaySession } from "../today-data";

function session(startedAt: string, endedAt: string): TodaySession {
  return {
    id: startedAt,
    activity: "Focus",
    started_at: startedAt,
    ended_at: endedAt,
    elapsed_seconds: 1800,
    default_tag_id: null,
    tag_name: null,
    tag_color: null,
    is_favorite: false,
  };
}

describe("CoreHour timeline layout", () => {
  it("keeps the full local day available", () => {
    expect(TIMELINE_BOUNDS).toEqual({ startMinute: 0, endMinute: 1440 });
  });

  it("clamps cross-midnight sessions to the selected day", () => {
    const layout = layoutTimelineSessions([
      session("2026-08-26T23:30:00+08:00", "2026-08-27T00:30:00+08:00"),
    ], "2026-08-27", 60);

    expect(layout[0]).toMatchObject({ startMinute: 0, endMinute: 30, top: 0, height: 28 });
  });

  it("positions sessions by local wall time across a daylight-saving change", () => {
    const previousTimeZone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      const layout = layoutTimelineSessions([
        session("2026-03-08T12:00:00-04:00", "2026-03-08T13:00:00-04:00"),
      ], "2026-03-08", 60);

      expect(layout[0]).toMatchObject({ startMinute: 720, endMinute: 780, top: 720, height: 58 });
    } finally {
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
  });

  it("snaps empty-space clicks to a 15-minute start time", () => {
    expect(snapTimelineMinute(70, 360, 60)).toBe(435);
    expect(snapTimelineMinute(2000, 360, 60)).toBe(1395);
  });
});
