import Database from "@tauri-apps/plugin-sql";
import type { DbResult } from "../features/core-hour/db-tauri";

let dbPromise: Promise<DbResult> | null = null;

export async function getDb(): Promise<DbResult> {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:efficiency-memo.db").then((db) => ({
      select: async <T = Record<string, unknown>>(sql: string, params?: unknown[]) =>
        db.select<T[]>(sql, params ?? []) as Promise<T[]>,
      execute: async (sql: string, params?: unknown[]) => {
        await db.execute(sql, params ?? []);
      },
    }));
  }
  return dbPromise!;
}

export async function dbSelect<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const db = await getDb();
  return db.select<T>(sql, params);
}

export async function dbExecute(sql: string, params?: unknown[]): Promise<void> {
  const db = await getDb();
  return db.execute(sql, params);
}
