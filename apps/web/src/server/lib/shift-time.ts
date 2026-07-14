/**
 * Shift time math helpers.
 *
 * Storage rule: Shift.startAt / Shift.endAt are always UTC timestamps.
 * Pattern rule: startTimeMinutes / endTimeMinutes are wall-clock minutes
 * within a day, interpreted in workspace.timezone (per Task 08 research §2).
 *
 * v1 limitation (research §2): we use plain UTC arithmetic and assume
 * workspace.timezone has fixed offset. Brazil — primary target — abolished
 * DST in 2019, so this is correct for v1. LatAm DST handling is a follow-up.
 */

const MINUTES_PER_DAY = 1440
const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 86_400_000

export interface ShiftTimeInput {
  /** Calendar date (year/month/day) at 00:00 UTC */
  date: Date
  startTimeMinutes: number
  endTimeMinutes: number
  crossesMidnight: boolean
}

export interface ShiftTimes {
  startAt: Date
  endAt: Date
}

export function computeShiftTimes(input: ShiftTimeInput): ShiftTimes {
  const dayStart = startOfUtcDay(input.date)
  const startAt = new Date(
    dayStart.getTime() + input.startTimeMinutes * MS_PER_MINUTE,
  )
  const durationMin = input.crossesMidnight
    ? MINUTES_PER_DAY - input.startTimeMinutes + input.endTimeMinutes
    : input.endTimeMinutes - input.startTimeMinutes
  const endAt = new Date(startAt.getTime() + durationMin * MS_PER_MINUTE)
  return { startAt, endAt }
}

export function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  )
}

/**
 * Validates pattern time fields. Returns true if internally consistent;
 * Caller surfaces SHIFT_TIME_INVALID on false.
 */
export function isPatternTimeValid(input: {
  startTimeMinutes: number
  endTimeMinutes: number
  crossesMidnight: boolean
}): boolean {
  const { startTimeMinutes: s, endTimeMinutes: e, crossesMidnight: x } = input
  if (s < 0 || s >= MINUTES_PER_DAY) return false
  if (e < 0 || e >= MINUTES_PER_DAY) return false
  if (s === e) return false
  if (x) {
    return e < s
  }
  return e > s
}

/**
 * Returns the UTC dates within `[rangeStart, rangeEnd)` whose UTC weekday
 * (0 = Sunday … 6 = Saturday) is in `daysOfWeek`. Each emitted Date is the
 * 00:00:00 UTC of that calendar day.
 */
export function expandPatternDates(
  rangeStart: Date,
  rangeEnd: Date,
  daysOfWeek: number[],
): Date[] {
  const dowSet = new Set(daysOfWeek)
  const out: Date[] = []
  let cursor = startOfUtcDay(rangeStart)
  const end = startOfUtcDay(rangeEnd)
  while (cursor < end) {
    if (dowSet.has(cursor.getUTCDay())) out.push(new Date(cursor))
    cursor = new Date(cursor.getTime() + MS_PER_DAY)
  }
  return out
}

export function diffInDays(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY)
}
