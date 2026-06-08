-- UP: Create Charger-Reminder schema (cr_ namespaced tables)
-- DOWN: Drop all cr_ namespaced tables

-- No users table: uses auth.users(id) instead

create table if not exists cr_device_presets (
  id uuid primary key,
  type text not null unique,
  default_threshold integer not null,
  estimated_drain_per_month numeric(6, 2) not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cr_device_presets_type_not_blank check (type <> ''),
  constraint cr_device_presets_default_threshold_between_0_and_100 check (
    default_threshold >= 0 and default_threshold <= 100
  ),
  constraint cr_device_presets_estimated_drain_positive check (
    estimated_drain_per_month > 0
  ),
  constraint cr_device_presets_label_not_blank check (label <> '')
);

create table if not exists cr_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  device_type text not null references cr_device_presets(type),
  capacity_mah integer,
  notes text,
  threshold_percent integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cr_devices_name_not_blank check (name <> ''),
  constraint cr_devices_capacity_mah_positive check (
    capacity_mah is null or capacity_mah > 0
  ),
  constraint cr_devices_threshold_percent_between_0_and_100 check (
    threshold_percent >= 0 and threshold_percent <= 100
  )
);

create index if not exists idx_cr_devices_user_id on cr_devices (user_id);
create index if not exists idx_cr_devices_device_type on cr_devices (device_type);

create table if not exists cr_charge_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references cr_devices(id) on delete cascade,
  charged_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_cr_charge_events_device_id on cr_charge_events (device_id);
create index if not exists idx_cr_charge_events_charged_at on cr_charge_events (charged_at desc);

create table if not exists cr_reminder_preferences (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null unique references cr_devices(id) on delete cascade,
  notify_before_days integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cr_reminder_preferences_notify_before_days_non_negative check (
    notify_before_days >= 0
  )
);

create table if not exists cr_computed_reminder_states (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null unique references cr_devices(id) on delete cascade,
  heuristic_version text not null,
  estimated_battery_percent numeric(5, 2),
  estimated_days_until_threshold integer,
  reminder_due_at timestamptz,
  status text not null,
  basis text not null,
  last_charge_event_id uuid references cr_charge_events(id) on delete set null,
  computed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cr_computed_reminder_states_heuristic_version_not_blank check (
    heuristic_version <> ''
  ),
  constraint cr_computed_reminder_states_status_not_blank check (
    status <> ''
  ),
  constraint cr_computed_reminder_states_basis_not_blank check (
    basis <> ''
  ),
  constraint cr_computed_reminder_states_estimated_battery_percent_between_0_and_100 check (
    estimated_battery_percent is null
    or (estimated_battery_percent >= 0 and estimated_battery_percent <= 100)
  )
);

create index if not exists idx_cr_computed_reminder_states_device_id
  on cr_computed_reminder_states (device_id);

-- DOWN: Drop all cr_ tables (order matters for FK constraints)
-- NOTE: Down migrations should be in a separate file, not executed with up