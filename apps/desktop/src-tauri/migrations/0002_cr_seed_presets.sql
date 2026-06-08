-- Ported from supabase/migrations/002_cr_seed_presets.sql to SQLite for Tauri desktop.
-- Up: Seed cr_device_presets with default device presets
-- Down: Remove all cr_device_presets seed data

-- SQLite uses INSERT OR REPLACE (since the type column has a UNIQUE constraint)
-- instead of Postgres' ON CONFLICT (type) DO UPDATE.
INSERT OR REPLACE INTO cr_device_presets (
  id,
  type,
  default_threshold,
  estimated_drain_per_month,
  label,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'wireless-mouse',
    25,
    8.50,
    'Wireless Mouse',
    '2026-06-08T00:00:00.000Z',
    '2026-06-08T00:00:00.000Z'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'game-controller',
    30,
    18.00,
    'Game Controller',
    '2026-06-08T00:00:00.000Z',
    '2026-06-08T00:00:00.000Z'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'wireless-keyboard',
    20,
    5.50,
    'Wireless Keyboard',
    '2026-06-08T00:00:00.000Z',
    '2026-06-08T00:00:00.000Z'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'bluetooth-headphones',
    35,
    28.00,
    'Bluetooth Headphones',
    '2026-06-08T00:00:00.000Z',
    '2026-06-08T00:00:00.000Z'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'power-bank',
    40,
    4.00,
    'Power Bank',
    '2026-06-08T00:00:00.000Z',
    '2026-06-08T00:00:00.000Z'
  );
