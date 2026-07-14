import { describe, expect, it } from 'vitest'

import { t } from '../t'

describe('t()', () => {
  it('returns the value for a known key', () => {
    expect(t('auth.login.title')).toBe('Fazer login')
  })

  it('returns the key itself for an unknown key', () => {
    expect(t('this.key.does.not.exist')).toBe('this.key.does.not.exist')
  })

  it('interpolates variables using {{var}} syntax', () => {
    // Use a test-only template via dict — but since dict is shared, use an
    // unknown key and test the interpolation fallback path.
    // Actually t() does interpolation on template whether or not the key is known.
    const key = 'nonexistent.greeting.{{name}}'
    // For robust testing, rely on the raw string path: simulate by passing
    // a key whose value IS the template. Since we don't want to pollute dict,
    // leverage unknown-key fallback which returns the key itself.
    expect(t(key, { name: 'Maria' })).toBe('nonexistent.greeting.Maria')
  })

  it('preserves {{var}} when variable is missing', () => {
    expect(t('{{count}} items', {})).toBe('{{count}} items')
  })

  it('supports numeric variables', () => {
    expect(t('you have {{count}} items', { count: 3 })).toBe('you have 3 items')
  })
})
