import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db', () => ({
  dbExecute: vi.fn().mockResolvedValue(undefined),
  dbSelect: vi.fn().mockResolvedValue([]),
}))

import {
  ensureLocalUser,
  getCurrentUser,
} from '../auth'
import { dbExecute, dbSelect } from '../db'

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

describe('ensureLocalUser', () => {
  it('reuses the existing local user', async () => {
    vi.mocked(dbSelect).mockResolvedValueOnce([{
      id: 'stable-user-id',
      email: 'test@example.com',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }])

    const user = await ensureLocalUser()

    expect(user.id).toBe('stable-user-id')
    expect(getCurrentUser()).toEqual(user)
    expect(dbExecute).not.toHaveBeenCalled()
  })

  it('creates a default user when the database is empty', async () => {
    const user = await ensureLocalUser()

    expect(user.id).toBe('local-user')
    expect(getCurrentUser()).toEqual(user)
    expect(dbExecute).toHaveBeenCalledOnce()
  })
})
