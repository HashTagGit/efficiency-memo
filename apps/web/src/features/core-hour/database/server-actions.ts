"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CheckIn,
  Session,
  SessionTag,
  Settings,
  Tag,
  Uuid,
} from "@/features/core-hour/types";

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function startSession(
  userId: Uuid,
  intervalMinutes: number = 30,
): Promise<Session> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ch_sessions")
    .insert({
      user_id: userId,
      started_at: new Date().toISOString(),
      interval_minutes: intervalMinutes,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to start session: ${error.message}`);
  }

  revalidatePath("/tools/core-hour");
  return data as Session;
}

export async function endSession(sessionId: Uuid): Promise<Session> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ch_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to end session: ${error.message}`);
  }

  revalidatePath("/tools/core-hour");
  return data as Session;
}

export async function listSessions(userId: Uuid): Promise<Session[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ch_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list sessions: ${error.message}`);
  }

  return (data ?? []) as Session[];
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function createTag(
  userId: Uuid,
  name: string,
  color: string = "#3b82f6",
): Promise<Tag> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ch_tags")
    .insert({ user_id: userId, name, color })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create tag: ${error.message}`);
  }

  revalidatePath("/tools/core-hour");
  return data as Tag;
}

export async function listTags(userId: Uuid): Promise<Tag[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ch_tags")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list tags: ${error.message}`);
  }

  return (data ?? []) as Tag[];
}

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

export async function createCheckIn(
  sessionId: Uuid,
  skipped: boolean = false,
  note: string = "",
): Promise<CheckIn> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ch_check_ins")
    .insert({
      session_id: sessionId,
      checked_at: new Date().toISOString(),
      skipped,
      note,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create check-in: ${error.message}`);
  }

  revalidatePath("/tools/core-hour");
  return data as CheckIn;
}

export async function listCheckIns(sessionId: Uuid): Promise<CheckIn[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ch_check_ins")
    .select("*")
    .eq("session_id", sessionId)
    .order("checked_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list check-ins: ${error.message}`);
  }

  return (data ?? []) as CheckIn[];
}

// ---------------------------------------------------------------------------
// Session Tags (ch_check_in_entries)
// ---------------------------------------------------------------------------

export async function createSessionTag(
  checkInId: Uuid,
  tagId: Uuid,
  percentage: number,
): Promise<SessionTag> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ch_check_in_entries")
    .insert({ check_in_id: checkInId, tag_id: tagId, percentage })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create session tag: ${error.message}`);
  }

  revalidatePath("/tools/core-hour");
  return data as SessionTag;
}

export async function listSessionTags(checkInId: Uuid): Promise<SessionTag[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ch_check_in_entries")
    .select("*")
    .eq("check_in_id", checkInId)
    .order("percentage", { ascending: false });

  if (error) {
    throw new Error(`Failed to list session tags: ${error.message}`);
  }

  return (data ?? []) as SessionTag[];
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ch_settings")
    .select("value")
    .eq("key", "interval_minutes")
    .single();

  if (error) {
    throw new Error(`Failed to get settings: ${error.message}`);
  }

  return { interval_minutes: Number(data.value) };
}

export async function updateIntervalMinutes(minutes: number): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("ch_settings").upsert(
    { key: "interval_minutes", value: String(minutes) },
    { onConflict: "key" },
  );

  if (error) {
    throw new Error(`Failed to update interval: ${error.message}`);
  }

  revalidatePath("/tools/core-hour");
}
