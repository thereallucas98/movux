import { describe, expect, it } from 'vitest'

import { slugify } from '../slugify'

describe('slugify', () => {
  it('lowercases simple ASCII names', () => {
    expect(slugify('UTI')).toBe('uti')
  })

  it('strips PT-BR diacritics', () => {
    expect(slugify('Centro Cirúrgico')).toBe('centro-cirurgico')
  })

  it('replaces em-dashes and accents', () => {
    expect(slugify('Pediatria – Manhã')).toBe('pediatria-manha')
  })

  it('returns "item" for symbol-only input', () => {
    expect(slugify('  ---  ')).toBe('item')
    expect(slugify('!!!')).toBe('item')
  })

  it('caps the slug at 50 chars', () => {
    const result = slugify('a'.repeat(80))
    expect(result.length).toBe(50)
    expect(/^a+$/.test(result)).toBe(true)
  })
})
