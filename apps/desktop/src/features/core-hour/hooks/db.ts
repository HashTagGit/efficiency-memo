/**
 * Database abstraction for CoreHour hooks on Tauri desktop.
 *
 * Re-exports DbResult, setDb, and resetDb from the Tauri-backed
 * implementation in db-tauri.ts. Use getDb() from lib/db.ts for
 * the actual database connection (singleton, lazy-loaded).
 */

export { type DbResult, setDb, resetDb } from "../db-tauri";
