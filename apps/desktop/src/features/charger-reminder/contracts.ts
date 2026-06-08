export type Uuid = string;
export type IsoTimestamp = string;

export type DevicePresetType =
  | "wireless-mouse"
  | "game-controller"
  | "wireless-keyboard"
  | "bluetooth-headphones"
  | "power-bank";

export interface DevicePresetRecord {
  id: Uuid;
  type: DevicePresetType;
  default_threshold: number;
  estimated_drain_per_month: number;
  label: string;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface DeviceRecord {
  id: Uuid;
  user_id: Uuid;
  name: string;
  device_type: DevicePresetType;
  capacity_mah: number | null;
  notes: string | null;
  threshold_percent: number;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface ChargeEventRecord {
  id: Uuid;
  device_id: Uuid;
  charged_at: IsoTimestamp;
  notes: string | null;
  created_at: IsoTimestamp;
}

export interface ReminderPreferenceRecord {
  id: Uuid;
  device_id: Uuid;
  notify_before_days: number;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface ComputedReminderStateRecord {
  id: Uuid;
  device_id: Uuid;
  heuristic_version: string;
  estimated_battery_percent: number | null;
  estimated_days_until_threshold: number | null;
  reminder_due_at: IsoTimestamp | null;
  status: string;
  basis: string;
  last_charge_event_id: Uuid | null;
  computed_at: IsoTimestamp;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface DeviceWithChargeHistory {
  device: DeviceRecord;
  preset: DevicePresetRecord;
  reminder_preference: ReminderPreferenceRecord | null;
  computed_reminder_state: ComputedReminderStateRecord | null;
  charge_events: ChargeEventRecord[];
}

export interface CreateDeviceInput {
  user_id: Uuid;
  name: string;
  device_type: DevicePresetType;
  capacity_mah?: number | null;
  notes?: string | null;
  threshold_percent: number;
}

export interface UpdateDeviceInput {
  id: Uuid;
  name?: string;
  device_type?: DevicePresetType;
  capacity_mah?: number | null;
  notes?: string | null;
  threshold_percent?: number;
  updated_at?: IsoTimestamp;
}

export interface CreateChargeEventInput {
  device_id: Uuid;
  charged_at: IsoTimestamp;
  notes?: string | null;
}

export interface UpsertReminderPreferenceInput {
  device_id: Uuid;
  notify_before_days: number;
}

export interface UpsertComputedReminderStateInput {
  device_id: Uuid;
  heuristic_version: string;
  estimated_battery_percent?: number | null;
  estimated_days_until_threshold?: number | null;
  reminder_due_at?: IsoTimestamp | null;
  status: string;
  basis: string;
  last_charge_event_id?: Uuid | null;
  computed_at: IsoTimestamp;
}

export interface DevicePersistenceContract {
  createDevice(input: CreateDeviceInput): Promise<DeviceRecord>;
  updateDevice(input: UpdateDeviceInput): Promise<DeviceRecord>;
  deleteDevice(deviceId: Uuid): Promise<void>;
  getDeviceById(deviceId: Uuid): Promise<DeviceWithChargeHistory | null>;
  listDevicesByUser(userId: Uuid): Promise<DeviceWithChargeHistory[]>;
  logChargeEvent(input: CreateChargeEventInput): Promise<ChargeEventRecord>;
  setReminderPreference(
    input: UpsertReminderPreferenceInput,
  ): Promise<ReminderPreferenceRecord>;
  setComputedReminderState(
    input: UpsertComputedReminderStateInput,
  ): Promise<ComputedReminderStateRecord>;
}
