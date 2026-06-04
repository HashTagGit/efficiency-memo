/**
 * Database abstraction for CoreHour hooks.
 *
 * Provides a mockable interface so tests can replace getDb() via vi.mock.
 * The actual implementation (IndexedDB / wa-sqlite) will be wired in later.
 */

export interface DbResult {
  select<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

let _db: DbResult | null = null;

export async function getDb(): Promise<DbResult> {
  if (!_db) {
    throw new Error("Database not configured. Call setDb() first.");
  }
  return _db;
}

/** Override the database instance (useful for tests and future web-DB init). */
export function setDb(db: DbResult): void {
  _db = db;
}

/** Reset to unconfigured state (useful for test teardown). */
export function resetDb(): void {
  _db = null;
}
