import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DataType, newDb } from "pg-mem";

type IntegrationQueryResult<TRow> = {
  rows: TRow[];
};

export type IntegrationPool = {
  end(): Promise<void>;
  query<TRow = unknown>(
    sql: string,
    values?: ReadonlyArray<unknown>,
  ): Promise<IntegrationQueryResult<TRow>>;
};

export async function createIntegrationDatabase() {
  const db = newDb({ autoCreateForeignKeyIndices: true });

  db.public.registerFunction({
    name: "gen_random_uuid",
    returns: DataType.uuid,
    implementation: randomUUID,
    impure: true,
  });

  // Create a minimal auth.users table so FK references from ch_tags and
  // ch_sessions resolve.  In production Supabase provides this via the
  // auth schema; pg-mem needs it explicit.
  db.public.none(`
    create schema if not exists auth;

    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid()
    );
  `);

  // Resolve repo root from this file:
  // apps/web/src/features/core-hour/database/test-database.ts
  const fileDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(fileDir, "..", "..", "..", "..", "..", "..");
  const migrationPath = path.join(
    repoRoot,
    "supabase",
    "migrations",
    "003_ch_core_hour.sql",
  );
  const sql = await readFile(migrationPath, "utf8");

  // Strip the DOWN section so pg-mem only applies the UP migration.
  const downMarkerIdx = sql.lastIndexOf("\n-- DOWN");
  const upMigration = downMarkerIdx >= 0 ? sql.slice(0, downMarkerIdx) : sql;

  db.public.none(upMigration);

  const { Pool } = db.adapters.createPg();
  const pool = new Pool() as IntegrationPool;

  return {
    pool,
  };
}
