export interface Violation {
  ruleId: string
  severity: 'warning' | 'error'
  message: string
  metadata?: Record<string, unknown>
}

export interface Rule<C> {
  id: string
  evaluate: (context: C) => Violation | null
}

export interface RuleEngine<C> {
  evaluate: (context: C) => Violation[]
}
