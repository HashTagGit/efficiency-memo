import { dbExecute } from "./db";

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

const SESSION_KEY = "efficiency-memo-session";

export async function signIn(email: string): Promise<User> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await dbExecute(
    `INSERT OR REPLACE INTO users (id, email, created_at, updated_at) VALUES ($1, $2, $3, $4)`,
    [id, email, now, now],
  );
  const user = { id, email, created_at: now, updated_at: now };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export async function requireSessionUser(): Promise<User> {
  const user = getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export function isMockAuthEnabled(): boolean {
  return (
    import.meta.env.VITE_ENABLE_AUTH_MOCK === "true" ||
    (typeof window !== "undefined" &&
      window.location.search.includes("mock_session=1"))
  );
}

export async function getMockUser(): Promise<User> {
  return {
    id: "mock-user-id",
    email: "mock@example.com",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

