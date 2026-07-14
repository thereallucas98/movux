import { computeShiftTimes, expandPatternDates } from '~/server/lib/shift-time'

import { PLAN_LIMITS, type PlanTier } from './plan-limits.config'
import type { BucketState, PatternBucketMeta } from './plan-limit-meta'
import {
  countShiftsInMonth,
  monthRangeUtc,
  type CountersDeps,
} from './usage-counters'

export interface PreflightPatternInput {
  workspaceId: string
  timezone: string
  rangeStart: Date
  rangeEnd: Date
  pattern: {
    daysOfWeek: number[]
    startTimeMinutes: number
    endTimeMinutes: number
    crossesMidnight: boolean
  }
  plan: PlanTier
}

export type PreflightPatternResult =
  | { ok: true; candidateCount: number }
  | { ok: false; meta: PatternBucketMeta }

/**
 * Multi-bucket pre-flight: groups candidate shifts by `startOfMonth` (in the
 * workspace timezone) and verifies each bucket can fit within the plan's
 * `shiftsPerMonthPerWorkspace` limit *combined with the existing rows*.
 *
 * On overflow, computes `firstViolatingDate` and proposes
 * `meta.suggestion.adjustedEndDate` (last day before the offender) so F06b
 * can offer a "shorten to" interaction. **Nothing is persisted in the failure
 * branch** — pre-flight is informational, not transactional (research §6).
 */
export async function preflightPatternQuota(
  deps: CountersDeps,
  input: PreflightPatternInput,
): Promise<PreflightPatternResult> {
  const limit = PLAN_LIMITS[input.plan].shiftsPerMonthPerWorkspace
  const dates = expandPatternDates(
    input.rangeStart,
    input.rangeEnd,
    input.pattern.daysOfWeek,
  )

  if (dates.length === 0) return { ok: true, candidateCount: 0 }
  // Corporate is unbounded — short-circuit
  if (limit === null) return { ok: true, candidateCount: dates.length }

  // Build candidate startAt timestamps to bucket them properly.
  const candidates = dates.map((date) => {
    const { startAt } = computeShiftTimes({
      date,
      startTimeMinutes: input.pattern.startTimeMinutes,
      endTimeMinutes: input.pattern.endTimeMinutes,
      crossesMidnight: input.pattern.crossesMidnight,
    })
    return startAt
  })

  // Group candidates by month-key in workspace tz.
  const byMonth = new Map<string, Date[]>()
  for (const startAt of candidates) {
    const key = monthKey(startAt, input.timezone)
    const arr = byMonth.get(key) ?? []
    arr.push(startAt)
    byMonth.set(key, arr)
  }

  const perMonth: Record<string, BucketState> = {}
  let firstViolatingDate: Date | null = null
  let firstViolatingKey: string | null = null

  for (const [key, monthCandidates] of byMonth.entries()) {
    const anchor = monthCandidates[0]
    const existing = await countShiftsInMonth(deps, {
      workspaceId: input.workspaceId,
      monthDate: anchor,
      timeZone: input.timezone,
    })
    const requested = monthCandidates.length
    const projected = existing + requested
    perMonth[key] = { existing, requested, projected, limit }
    // Use checkQuota to keep the (current + 1 <= limit) semantics consistent.
    // For batch: projected <= limit means the whole batch fits.
    if (projected > limit && firstViolatingDate === null) {
      const allowedFromBatch = Math.max(0, limit - existing)
      const sortedCandidates = [...monthCandidates].sort(
        (a, b) => a.getTime() - b.getTime(),
      )
      firstViolatingDate =
        allowedFromBatch < sortedCandidates.length
          ? sortedCandidates[allowedFromBatch]
          : sortedCandidates[0]
      firstViolatingKey = key
    }
  }

  if (firstViolatingDate === null || firstViolatingKey === null) {
    return { ok: true, candidateCount: candidates.length }
  }

  const adjustedEndDate = subOneDay(firstViolatingDate)
  const wouldGenerate = candidates.filter(
    (d) => d.getTime() <= adjustedEndDate.getTime(),
  ).length

  const meta: PatternBucketMeta = {
    shape: 'pattern',
    resource: 'shiftsPerMonthPerWorkspace',
    plan: input.plan,
    perMonth,
    suggestion: { adjustedEndDate, wouldGenerate },
  }
  return { ok: false, meta }
}

function monthKey(d: Date, timeZone: string): string {
  const { startUtc } = monthRangeUtc(d, timeZone)
  // Format the start of month in the timezone for a stable YYYY-MM key.
  const local = startUtc.toLocaleString('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  })
  // 'YYYY-MM' or 'YYYY-MM, ...' — take the date portion only.
  const datePart = local.split(',')[0].trim()
  // Ensure 'YYYY-MM' shape (en-CA short returns 'YYYY-MM')
  return datePart
}

function subOneDay(d: Date): Date {
  const result = new Date(d)
  result.setUTCDate(result.getUTCDate() - 1)
  return result
}
