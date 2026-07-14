import { describe, expect, it } from 'vitest'

import { fromMinutes, toMinutes } from '../time'

describe('toMinutes / fromMinutes', () => {
  it('round-trips a typical morning time', () => {
    expect(toMinutes('07:30')).toBe(450)
    expect(fromMinutes(450)).toBe('07:30')
  })

  it('handles midnight boundaries', () => {
    expect(toMinutes('00:00')).toBe(0)
    expect(fromMinutes(0)).toBe('00:00')
    expect(toMinutes('23:59')).toBe(1439)
    expect(fromMinutes(1439)).toBe('23:59')
  })

  it('returns 0 for malformed input in toMinutes', () => {
    expect(toMinutes('')).toBe(0)
    expect(toMinutes('not-a-time')).toBe(0)
  })

  it('clamps and zero-pads in fromMinutes', () => {
    expect(fromMinutes(-5)).toBe('00:00')
    expect(fromMinutes(2000)).toBe('23:59')
    expect(fromMinutes(65)).toBe('01:05')
  })
})
