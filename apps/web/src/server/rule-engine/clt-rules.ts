import type { Rule } from './types'

/**
 * CLT soft rules — Brazilian labor-law warnings (Task 13 research §4).
 * Both rules return `severity: 'warning'`. They never block clock-out;
 * the use-case logs each Violation as an audit-log entry and lets the
 * worker proceed (BF §10).
 */

export interface CLTContext {
  userId: string
  workspaceId: string
  /** Just-recorded clock-out moment. */
  clockOutAt: Date
  /** Shift end being clocked out from. */
  shiftEndAt: Date
  /** Most recent prior clock-out for this user (any workspace). */
  lastClockOutAt: Date | null
  /** Total worked hours in [start of week, clockOutAt) for this user. */
  hoursThisWeek: number
}

const ELEVEN_HOURS_MS = 11 * 60 * 60 * 1000
const WEEKLY_CAP_HOURS = 44

export const minInterShiftRestRule: Rule<CLTContext> = {
  id: 'CLT_MIN_INTER_SHIFT_REST',
  evaluate(ctx) {
    if (!ctx.lastClockOutAt) return null
    const restMs = ctx.clockOutAt.getTime() - ctx.lastClockOutAt.getTime()
    if (restMs >= ELEVEN_HOURS_MS) return null
    return {
      ruleId: 'CLT_MIN_INTER_SHIFT_REST',
      severity: 'warning',
      message: 'Inter-shift rest below 11h (CLT minimum)',
      metadata: {
        restMs,
        requiredMs: ELEVEN_HOURS_MS,
        lastClockOutAt: ctx.lastClockOutAt.toISOString(),
        clockOutAt: ctx.clockOutAt.toISOString(),
      },
    }
  },
}

export const maxWeeklyHoursRule: Rule<CLTContext> = {
  id: 'CLT_MAX_WEEKLY_HOURS',
  evaluate(ctx) {
    if (ctx.hoursThisWeek <= WEEKLY_CAP_HOURS) return null
    return {
      ruleId: 'CLT_MAX_WEEKLY_HOURS',
      severity: 'warning',
      message: 'Weekly hours exceed 44h (CLT cap)',
      metadata: {
        hoursThisWeek: ctx.hoursThisWeek,
        capHours: WEEKLY_CAP_HOURS,
      },
    }
  },
}

export const cltRules: Rule<CLTContext>[] = [
  minInterShiftRestRule,
  maxWeeklyHoursRule,
]
