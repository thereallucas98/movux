import type { Rule, RuleEngine, Violation } from './types'

export function createRuleEngine<C>(rules: Rule<C>[]): RuleEngine<C> {
  return {
    evaluate(context) {
      const violations: Violation[] = []
      for (const rule of rules) {
        const result = rule.evaluate(context)
        if (result !== null) {
          violations.push(result)
        }
      }
      return violations
    },
  }
}
