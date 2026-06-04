export const MOCK_AUTH_COOKIE = "efficiency-memo-mock-auth";

export function isMockAuthEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return (
    process.env.NEXT_PUBLIC_ENABLE_AUTH_MOCK === "true" ||
    process.env.AUTH_E2E_MOCK === "true"
  );
}

export function normalizeAuthEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase();

  return value ? value : null;
}

export function buildMockMagicLink(email: string, nextPath: string): string {
  const params = new URLSearchParams({
    mock_session: "1",
    email,
    next: nextPath,
  });

  return `/auth/callback?${params.toString()}`;
}

export function getMockAuthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}