import { describe, expect, it } from 'vitest'

import { serializeCsv, serializeRow } from '../csv'

describe('serializeRow', () => {
  it('joins plain values with commas', () => {
    expect(serializeRow(['a', 'b', 'c'])).toBe('a,b,c')
  })

  it('quotes values containing commas', () => {
    expect(serializeRow(['a,b', 'c'])).toBe('"a,b",c')
  })

  it('quotes values containing double quotes and escapes them', () => {
    expect(serializeRow(['she said "hi"'])).toBe('"she said ""hi"""')
  })

  it('quotes values containing CR/LF', () => {
    expect(serializeRow(['line1\nline2'])).toBe('"line1\nline2"')
    expect(serializeRow(['line1\r\nline2'])).toBe('"line1\r\nline2"')
  })

  it('renders null and undefined as empty fields', () => {
    expect(serializeRow([null, 'x', undefined])).toBe(',x,')
  })

  it('renders numbers and booleans without quoting', () => {
    expect(serializeRow([1, 2.5, true, false])).toBe('1,2.5,true,false')
  })

  it('preserves leading/trailing whitespace as-is (no quoting needed)', () => {
    expect(serializeRow(['  hi  '])).toBe('  hi  ')
  })
})

describe('serializeCsv', () => {
  it('emits header row + body separated by CRLF and ends with CRLF', () => {
    const out = serializeCsv(
      ['id', 'name'],
      [
        ['1', 'Alice'],
        ['2', 'Bob'],
      ],
    )
    expect(out).toBe('id,name\r\n1,Alice\r\n2,Bob\r\n')
  })

  it('emits header-only output for an empty body', () => {
    expect(serializeCsv(['id', 'name'], [])).toBe('id,name\r\n')
  })

  it('quotes commas and quotes within cells in the body', () => {
    const out = serializeCsv(['id', 'note'], [['1', 'Maria, José "Pepe"']])
    expect(out).toBe('id,note\r\n1,"Maria, José ""Pepe"""\r\n')
  })

  it('handles mixed types in rows', () => {
    const out = serializeCsv(
      ['id', 'count', 'active', 'note'],
      [['x', 3, true, null]],
    )
    expect(out).toBe('id,count,active,note\r\nx,3,true,\r\n')
  })
})
