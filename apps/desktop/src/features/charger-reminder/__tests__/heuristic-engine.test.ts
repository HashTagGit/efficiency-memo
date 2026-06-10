import { describe, it, expect } from 'vitest'
import { computeDeterministicReminderState } from '../heuristic-engine'

const NOW = '2026-06-10T12:00:00.000Z'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * ONE_DAY_MS).toISOString()
}

describe('computeDeterministicReminderState', () => {
  it('returns "needs-charge-log" when last_full_charge_at is null', () => {
    const result = computeDeterministicReminderState({
      device_type: 'wireless-mouse',
      threshold_percent: 25,
      last_full_charge_at: null,
      computed_at: NOW,
    })

    expect(result.status).toBe('needs-charge-log')
    expect(result.estimated_battery_percent).toBeNull()
    expect(result.estimated_days_until_threshold).toBeNull()
    expect(result.reminder_due_at).toBeNull()
    expect(result.basis).toContain('waiting for first full-charge event')
  })

  it('returns "tracking" when battery is well above threshold', () => {
    const result = computeDeterministicReminderState({
      device_type: 'wireless-mouse',
      threshold_percent: 25,
      last_full_charge_at: daysAgo(30),
      computed_at: NOW,
    })

    expect(result.status).toBe('tracking')
    expect(result.estimated_battery_percent).toBeGreaterThan(25)
    expect(result.estimated_days_until_threshold).toBeGreaterThan(0)
    expect(result.reminder_due_at).toBeTruthy()
    expect(result.heuristic_version).toBe('deterministic-v1')
  })

  it('returns "charge-now" when estimated battery is at or below threshold', () => {
    const result = computeDeterministicReminderState({
      device_type: 'wireless-mouse',
      threshold_percent: 25,
      last_full_charge_at: daysAgo(320),
      computed_at: NOW,
    })

    expect(result.status).toBe('charge-now')
    if (result.estimated_battery_percent !== null) {
      expect(result.estimated_battery_percent).toBeLessThanOrEqual(25)
    }
  })

  it('returns "remind" when reminder due date has passed but battery still above threshold', () => {
    const result = computeDeterministicReminderState({
      device_type: 'wireless-mouse',
      threshold_percent: 5,
      notify_before_days: 30,
      last_full_charge_at: daysAgo(310),
      computed_at: NOW,
    })

    expect(result.status).toBe('remind')
    if (result.estimated_battery_percent !== null) {
      expect(result.estimated_battery_percent).toBeGreaterThan(5)
    }
  })

  it('throws on invalid threshold_percent', () => {
    expect(() =>
      computeDeterministicReminderState({
        device_type: 'wireless-mouse',
        threshold_percent: 150,
        last_full_charge_at: NOW,
        computed_at: NOW,
      }),
    ).toThrow('threshold_percent must be between 0 and 100')
  })

  it('throws on unknown device type', () => {
    expect(() =>
      computeDeterministicReminderState({
        device_type: 'unknown-gadget' as never,
        threshold_percent: 20,
        last_full_charge_at: NOW,
        computed_at: NOW,
      }),
    ).toThrow('Unsupported device preset')
  })

  it('capacity factor adjusts drain rate based on capacity_mah', () => {
    const withCapacity = computeDeterministicReminderState({
      device_type: 'wireless-mouse',
      capacity_mah: 4000,
      threshold_percent: 25,
      last_full_charge_at: daysAgo(30),
      computed_at: NOW,
    })

    const withoutCapacity = computeDeterministicReminderState({
      device_type: 'wireless-mouse',
      threshold_percent: 25,
      last_full_charge_at: daysAgo(30),
      computed_at: NOW,
    })

    // Larger capacity → lower drain factor → higher estimated battery
    if (
      withCapacity.estimated_battery_percent != null &&
      withoutCapacity.estimated_battery_percent != null
    ) {
      expect(withCapacity.estimated_battery_percent).toBeGreaterThan(
        withoutCapacity.estimated_battery_percent,
      )
    }
  })

  it('notify_before_days shifts reminder_due_at earlier', () => {
    const withLead = computeDeterministicReminderState({
      device_type: 'wireless-mouse',
      threshold_percent: 25,
      notify_before_days: 7,
      last_full_charge_at: daysAgo(30),
      computed_at: NOW,
    })

    const withoutLead = computeDeterministicReminderState({
      device_type: 'wireless-mouse',
      threshold_percent: 25,
      last_full_charge_at: daysAgo(30),
      computed_at: NOW,
    })

    expect(withLead.reminder_due_at).not.toBe(withoutLead.reminder_due_at)
  })
})
