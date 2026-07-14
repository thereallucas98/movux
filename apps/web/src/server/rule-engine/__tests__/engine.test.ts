import { describe, expect, it } from 'vitest'

import { createRuleEngine } from '../engine'
import type { Rule } from '../types'

interface SampleContext {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
}

const noFridayRule: Rule<SampleContext> = {
  id: 'no-friday',
  evaluate: (context) =>
    context.day === 'friday'
      ? {
          ruleId: 'no-friday',
          severity: 'warning',
          message: 'Fridays are off.',
        }
      : null,
}

describe('createRuleEngine', () => {
  it('returns no violations when no rule fires', () => {
    const engine = createRuleEngine<SampleContext>([noFridayRule])
    expect(engine.evaluate({ day: 'monday' })).toEqual([])
  })

  it('returns a violation when a rule fires', () => {
    const engine = createRuleEngine<SampleContext>([noFridayRule])
    const violations = engine.evaluate({ day: 'friday' })
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({
      ruleId: 'no-friday',
      severity: 'warning',
    })
  })

  it('aggregates multiple rules', () => {
    const alwaysFailing: Rule<SampleContext> = {
      id: 'always-fails',
      evaluate: () => ({
        ruleId: 'always-fails',
        severity: 'error',
        message: 'Nope.',
      }),
    }
    const engine = createRuleEngine<SampleContext>([
      noFridayRule,
      alwaysFailing,
    ])
    const violations = engine.evaluate({ day: 'friday' })
    expect(violations).toHaveLength(2)
    expect(violations.map((v) => v.ruleId)).toEqual([
      'no-friday',
      'always-fails',
    ])
  })
})
