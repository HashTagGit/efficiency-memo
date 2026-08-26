import { dbExecute, dbSelect } from "./db";

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

const SESSION_KEY = "efficiency-memo-session";

export async function ensureLocalUser(): Promise<User> {
  const stored = getCurrentUser();
  const [existing] = await dbSelect<User>(
    "SELECT id, email, created_at, updated_at FROM users ORDER BY CASE WHEN id = $1 THEN 0 ELSE 1 END, updated_at DESC LIMIT 1",
    [stored?.id ?? ""],
  );

  if (existing) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(existing));
    return existing;
  }

  const now = new Date().toISOString();
  const user = { id: "local-user", email: "local@efficiency-memo", created_at: now, updated_at: now };
  await dbExecute(
    "INSERT INTO users (id, email, created_at, updated_at) VALUES ($1, $2, $3, $4)",
    [user.id, user.email, user.created_at, user.updated_at],
  );
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

