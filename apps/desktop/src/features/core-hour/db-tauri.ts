/**
 * Database abstraction for CoreHour on Tauri desktop.
 *
 * Mirrors the interface from apps/web/src/features/core-hour/hooks/db.ts
 * so CoreHour hooks can use tauriDb identically on desktop.
 */

export interface DbResult {
  select<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

let _db: DbResult | null = null;

export const tauriDb: DbResult = {
  select: async <T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> => {
    if (!_db) {
      throw new Error("Database not initialized. Call setDbOnStartup() first.");
    }
    return _db.select<T>(sql, params);
  },
  execute: async (sql: string, params?: unknown[]): Promise<void> => {
    if (!_db) {
      throw new Error("Database not initialized. Call setDbOnStartup() first.");
    }
    return _db.execute(sql, params);
  },
};

/**
 * Initialize the database singleton from @tauri-apps/plugin-sql.
 * Must be called once at app startup before any CoreHour hooks use tauriDb.
 *
 * Uses a dynamic import to avoid a circular dependency on lib/db.ts,
 * which imports the DbResult interface from this file.
 */
export async function setDbOnStartup(): Promise<void> {
  const { getDb } = await import("../../lib/db");
  _db = await getDb();
}

/** Override the database instance (useful for tests). */
export function setDb(db: DbResult): void {
  _db = db;
}

/** Reset to unconfigured state (useful for test teardown). */
export function resetDb(): void {
  _db = null;
}
