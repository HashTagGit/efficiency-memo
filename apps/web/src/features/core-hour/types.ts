export type Uuid = string;
export type IsoTimestamp = string;

export interface Session {
  id: Uuid;
  user_id: Uuid;
  started_at: IsoTimestamp;
  ended_at: IsoTimestamp | null;
  interval_minutes: number;
  synced: boolean;
}

export interface Tag {
  id: Uuid;
  user_id: Uuid;
  name: string;
  color: string;
  is_archived: boolean;
  created_at: IsoTimestamp;
  synced: boolean;
}

export interface CheckIn {
  id: Uuid;
  session_id: Uuid;
  checked_at: IsoTimestamp;
  skipped: boolean;
  note: string;
  synced: boolean;
}

export interface SessionTag {
  id: Uuid;
  check_in_id: Uuid;
  tag_id: Uuid;
  percentage: number;
  synced: boolean;
}

export interface Settings {
  interval_minutes: number;
}
