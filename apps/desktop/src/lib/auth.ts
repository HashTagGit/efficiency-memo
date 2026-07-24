import { dbExecute, dbSelect } from "./db";

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

const SESSION_KEY = "efficiency-memo-session";

export async function signIn(email: string): Promise<User> {
  const now = new Date().toISOString();
  const [existing] = await dbSelect<User>(
    "SELECT id, email, created_at, updated_at FROM users WHERE email = $1 ORDER BY updated_at DESC LIMIT 1",
    [email],
  );
  const user = existing
    ? { ...existing, updated_at: now }
    : { id: crypto.randomUUID(), email, created_at: now, updated_at: now };

  if (existing) {
    await dbExecute("UPDATE users SET updated_at = $1 WHERE id = $2", [now, user.id]);
  } else {
    await dbExecute(
      "INSERT INTO users (id, email, created_at, updated_at) VALUES ($1, $2, $3, $4)",
      [user.id, user.email, user.created_at, user.updated_at],
    );
  }
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

