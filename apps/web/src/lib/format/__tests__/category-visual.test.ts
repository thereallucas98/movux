import { describe, expect, it } from 'vitest'

import { categoryVisual } from '../category-visual'

describe('categoryVisual', () => {
  it('returns the same palette + icon for the same id', () => {
    const a = categoryVisual('11111111-1111-4111-8111-111111111111')
    const b = categoryVisual('11111111-1111-4111-8111-111111111111')
    expect(a.palette).toBe(b.palette)
    expect(a.Icon).toBe(b.Icon)
    expect(a.blockClass).toBe(b.blockClass)
  })

  it('exposes a Tailwind class string with bg- and text- tokens', () => {
    const v = categoryVisual('any-id')
    expect(v.blockClass).toMatch(/^bg-/)
    expect(v.blockClass).toContain('text-')
  })

  it('distributes across the palette across many ids', () => {
    const palettes = new Set<string>()
    for (let i = 0; i < 50; i++) {
      palettes.add(categoryVisual(`cat-${i}`).palette)
    }
    expect(palettes.size).toBeGreaterThan(1)
  })
})
