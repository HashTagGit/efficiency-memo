import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  saveSessionBlock,
} from "../session-editor-data";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue("session-1"),
}));

describe("CoreHour session editor data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid and overlapping ranges before writing", async () => {
    const invalid = {
      userId: "local-user",
      activity: "Planning",
      defaultTagId: null,
      startedAt: "2026-08-27T10:00:00.000Z",
      endedAt: "2026-08-27T09:00:00.000Z",
    };
    await expect(saveSessionBlock(invalid)).rejects.toMatchObject({ code: "invalid-range" });
    expect(invoke).not.toHaveBeenCalled();

    vi.mocked(invoke).mockRejectedValueOnce("overlap");
    await expect(saveSessionBlock({ ...invalid, endedAt: "2026-08-27T11:00:00.000Z" }))
      .rejects.toMatchObject({ code: "overlap" });
    expect(invoke).toHaveBeenCalledOnce();
  });

  it("rejects a manual block that crosses a local day boundary", async () => {
    await expect(saveSessionBlock({
      userId: "local-user",
      activity: "Late work",
      defaultTagId: null,
      startedAt: "2026-08-27T23:30",
      endedAt: "2026-08-28T00:30",
    })).rejects.toMatchObject({ code: "cross-day" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("sends a validated manual block to the native transaction", async () => {
    await saveSessionBlock({
      userId: "local-user",
      activity: "Planning",
      defaultTagId: "tag-1",
      startedAt: "2026-08-27T10:00:00.000Z",
      endedAt: "2026-08-27T11:00:00.000Z",
    });

    expect(invoke).toHaveBeenCalledWith("save_core_hour_session_block", {
      input: expect.objectContaining({
        user_id: "local-user",
        activity: "Planning",
        default_tag_id: "tag-1",
        started_at: "2026-08-27T10:00:00.000Z",
        ended_at: "2026-08-27T11:00:00.000Z",
        adjust_duration: true,
      }),
    });
  });
});
