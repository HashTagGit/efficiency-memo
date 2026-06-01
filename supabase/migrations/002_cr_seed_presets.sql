-- UP: Seed cr_device_presets with default device presets
-- DOWN: Remove all cr_device_presets seed data

insert into cr_device_presets (
  id,
  type,
  default_threshold,
  estimated_drain_per_month,
  label
)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'wireless-mouse',
    25,
    8.50,
    'Wireless Mouse'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'game-controller',
    30,
    18.00,
    'Game Controller'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'wireless-keyboard',
    20,
    5.50,
    'Wireless Keyboard'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'bluetooth-headphones',
    35,
    28.00,
    'Bluetooth Headphones'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'power-bank',
    40,
    4.00,
    'Power Bank'
  )
on conflict (type) do update
set
  default_threshold = excluded.default_threshold,
  estimated_drain_per_month = excluded.estimated_drain_per_month,
  label = excluded.label,
  updated_at = now();

-- DOWN: (no action needed for seed rollback - data is transient)