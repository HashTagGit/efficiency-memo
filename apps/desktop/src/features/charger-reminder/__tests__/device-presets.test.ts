import { describe, it, expect } from 'vitest'
import { devicePresetSeeds } from '../device-presets'

describe('devicePresetSeeds', () => {
  it('contains exactly 5 presets', () => {
    expect(devicePresetSeeds).toHaveLength(5)
  })

  it('all presets have valid UUIDs', () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    for (const preset of devicePresetSeeds) {
      expect(preset.id).toMatch(uuidRegex)
    }
  })

  it('all preset IDs are unique', () => {
    const ids = devicePresetSeeds.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all preset types are unique', () => {
    const types = devicePresetSeeds.map((p) => p.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('all drain rates are positive numbers', () => {
    for (const preset of devicePresetSeeds) {
      expect(preset.estimated_drain_per_month).toBeGreaterThan(0)
    }
  })

  it('all default thresholds are between 0 and 100', () => {
    for (const preset of devicePresetSeeds) {
      expect(preset.default_threshold).toBeGreaterThanOrEqual(0)
      expect(preset.default_threshold).toBeLessThanOrEqual(100)
    }
  })

  it('all labels are non-empty strings', () => {
    for (const preset of devicePresetSeeds) {
      expect(preset.label).toBeTruthy()
      expect(typeof preset.label).toBe('string')
    }
  })

  it('contains expected device types', () => {
    const types = devicePresetSeeds.map((p) => p.type)
    expect(types).toContain('wireless-mouse')
    expect(types).toContain('game-controller')
    expect(types).toContain('wireless-keyboard')
    expect(types).toContain('bluetooth-headphones')
    expect(types).toContain('power-bank')
  })
})
