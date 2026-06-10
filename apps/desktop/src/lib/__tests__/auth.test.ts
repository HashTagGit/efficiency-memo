import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db', () => ({
  dbExecute: vi.fn().mockResolvedValue(undefined),
}))

import {
  signIn,
  signOut,
  getCurrentUser,
  requireSessionUser,
  isMockAuthEnabled,
  getMockUser,
} from '../auth'

let store: Record<string, string>

beforeEach(() => {
  store = {}
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    length: 0,
    key: () => null,
  }
  vi.clearAllMocks()
})

describe('signIn', () => {
  it('creates a user and stores session in localStorage', async () => {
    const user = await signIn('test@example.com')

    expect(user.email).toBe('test@example.com')
    expect(user.id).toBeTruthy()
    expect(typeof user.id).toBe('string')
    expect(user.created_at).toBeTruthy()
    expect(user.updated_at).toBeTruthy()

    const stored = getCurrentUser()
    expect(stored).toEqual(user)
  })
})

describe('signOut', () => {
  it('removes the session from localStorage', async () => {
    await signIn('test@example.com')
    expect(getCurrentUser()).not.toBeNull()

    await signOut()
    expect(getCurrentUser()).toBeNull()
  })
})

describe('getCurrentUser', () => {
  it('returns null when no session exists', () => {
    expect(getCurrentUser()).toBeNull()
  })

  it('returns the user when session exists', async () => {
    const user = await signIn('test@example.com')
    expect(getCurrentUser()).toEqual(user)
  })
})

describe('requireSessionUser', () => {
  it('returns the user when session exists', async () => {
    const user = await signIn('test@example.com')
    const result = await requireSessionUser()
    expect(result).toEqual(user)
  })

  it('throws "Unauthorized" when no session exists', async () => {
    await expect(requireSessionUser()).rejects.toThrow('Unauthorized')
  })
})

describe('getMockUser', () => {
  it('returns a mock user with known values', async () => {
    const user = await getMockUser()

    expect(user.id).toBe('mock-user-id')
    expect(user.email).toBe('mock@example.com')
    expect(user.created_at).toBe('2026-01-01T00:00:00.000Z')
    expect(user.updated_at).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('isMockAuthEnabled', () => {
  it('returns false by default', () => {
    expect(isMockAuthEnabled()).toBe(false)
  })
})
