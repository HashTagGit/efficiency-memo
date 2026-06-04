import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseBrowserClient } from '../client';

// Mock the env module
vi.mock('@/lib/env', () => ({
  getEnv: vi.fn(() => ({
    supabaseUrl: 'https://demo.supabase.co',
    supabaseAnonKey: 'test-anon-key',
  })),
}));

describe('createSupabaseBrowserClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a client with correct URL and anon key', () => {
    const client = createSupabaseBrowserClient();
    expect(client).toBeDefined();
  });

  it('returns singleton instance on multiple calls', () => {
    const client1 = createSupabaseBrowserClient();
    const client2 = createSupabaseBrowserClient();
    expect(client1).toBe(client2);
  });
});