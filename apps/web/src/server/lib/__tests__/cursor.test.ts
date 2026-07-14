import { describe, expect, it } from 'vitest'

import {
  decodeCursor,
  encodeCursor,
  isStartAtCursor,
  type Cursor,
  type StartAtCursor,
} from '../cursor'

describe('cursor', () => {
  const sample: Cursor = {
    createdAt: '2026-04-21T10:00:00.000Z',
    id: 'abc-123-def-456',
  }

  it('round-trips encode → decode', () => {
    const encoded = encodeCursor(sample)
    expect(encoded).toBeTypeOf('string')
    expect(encoded).not.toContain('=') // base64url has no padding '='
    expect(decodeCursor(encoded)).toEqual(sample)
  })

  it('returns null for null or empty input', () => {
    expect(decodeCursor(null)).toBeNull()
    expect(decodeCursor(undefined)).toBeNull()
    expect(decodeCursor('')).toBeNull()
  })

  it('returns null for invalid base64url', () => {
    expect(decodeCursor('!!!not-base64!!!')).toBeNull()
  })

  it('returns null for valid base64url with invalid JSON', () => {
    const notJson = Buffer.from('not a json', 'utf-8').toString('base64url')
    expect(decodeCursor(notJson)).toBeNull()
  })

  it('returns null for JSON missing required fields', () => {
    const missingId = Buffer.from(
      JSON.stringify({ createdAt: '2026-04-21T10:00:00Z' }),
      'utf-8',
    ).toString('base64url')
    expect(decodeCursor(missingId)).toBeNull()

    const missingCreatedAt = Buffer.from(
      JSON.stringify({ id: 'abc' }),
      'utf-8',
    ).toString('base64url')
    expect(decodeCursor(missingCreatedAt)).toBeNull()

    const wrongTypes = Buffer.from(
      JSON.stringify({ createdAt: 123, id: 456 }),
      'utf-8',
    ).toString('base64url')
    expect(decodeCursor(wrongTypes)).toBeNull()
  })

  it('encodes different cursors to different strings', () => {
    const a = encodeCursor({ createdAt: '2026-04-21T10:00:00Z', id: 'a' })
    const b = encodeCursor({ createdAt: '2026-04-21T10:00:00Z', id: 'b' })
    expect(a).not.toBe(b)
  })

  describe('StartAtCursor variant', () => {
    const startAtSample: StartAtCursor = {
      startAt: '2026-07-14T08:00:00.000Z',
      id: 'shift-1',
    }

    it('round-trips with isStartAtCursor validator', () => {
      const encoded = encodeCursor(startAtSample)
      expect(decodeCursor(encoded, isStartAtCursor)).toEqual(startAtSample)
    })

    it('default decoder rejects a startAt cursor', () => {
      const encoded = encodeCursor(startAtSample)
      expect(decodeCursor(encoded)).toBeNull()
    })

    it('isStartAtCursor rejects a createdAt cursor', () => {
      const encoded = encodeCursor(sample)
      expect(decodeCursor(encoded, isStartAtCursor)).toBeNull()
    })
  })
})
