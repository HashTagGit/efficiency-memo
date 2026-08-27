import { invoke } from "@tauri-apps/api/core";

export type SessionBlockErrorCode = "invalid-range" | "overlap" | "cross-day" | "invalid-plan";

export class SessionBlockError extends Error {
  constructor(public readonly code: SessionBlockErrorCode) {
    super(code);
  }
}

export interface SessionBlockInput {
  id?: string;
  userId: string;
  activity: string;
  defaultTagId: string | null;
  startedAt: string;
  endedAt: string;
  adjustDuration?: boolean;
  adjustTag?: boolean;
  sourcePlanId?: string;
}

export async function saveSessionBlock(input: SessionBlockInput): Promise<string> {
  const startedAt = new Date(input.startedAt);
  const endedAt = new Date(input.endedAt);
  const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
  const startLocalDate = input.startedAt.slice(0, 10);
  const endLocalDate = input.endedAt.slice(0, 10);
  if ((!input.id || input.adjustDuration) && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) {
    throw new SessionBlockError("invalid-range");
  }
  if ((!input.id || input.adjustDuration) && startLocalDate !== endLocalDate) {
    throw new SessionBlockError("cross-day");
  }

  try {
    return await invoke<string>("save_core_hour_session_block", {
      input: {
        id: input.id ?? null,
        user_id: input.userId,
        activity: input.activity.trim(),
        default_tag_id: input.defaultTagId,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        adjust_duration: input.id ? Boolean(input.adjustDuration) : true,
        adjust_tag: input.id ? Boolean(input.adjustTag) : true,
        start_local_date: startLocalDate,
        end_local_date: endLocalDate,
        new_session_id: crypto.randomUUID(),
        new_check_in_id: crypto.randomUUID(),
        new_entry_id: crypto.randomUUID(),
        source_plan_id: input.sourcePlanId ?? null,
      },
    });
  } catch (error) {
    if (error === "overlap" || error === "invalid-range" || error === "cross-day" || error === "invalid-plan") {
      throw new SessionBlockError(error);
    }
    throw error;
  }
}
