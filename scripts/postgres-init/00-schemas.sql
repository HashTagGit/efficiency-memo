-- =============================================================================
-- 00-schemas.sql — Pre-create Supabase service schemas.
--
-- GoTrue's startup migration uses `CREATE TABLE IF NOT EXISTS <schema>.<table>`,
-- which requires the schema to already exist. This file creates the schemas
-- the docker-compose services depend on, mounted into the `db` container's
-- `/docker-entrypoint-initdb.d/` so they run on first boot (when the data
-- volume is empty) OR by the `schema-bootstrap` service which runs between
-- `db` and `auth` on subsequent boots.
--
-- Add more schemas here if the project later pulls in services that expect
-- pre-existing schemas (e.g. `storage`, `realtime`, `supabase_functions`).
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS auth;
