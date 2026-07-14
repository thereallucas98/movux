import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

export type CalendarView = 'month' | 'week' | 'day' | 'table'

const WEEK_OPTS = { weekStartsOn: 1 as const, locale: ptBR }

function anchorDate(cursor: string, tz: string): Date {
  return toZonedTime(new Date(cursor + 'T12:00:00Z'), tz)
}

export function periodBounds(
  cursor: string,
  view: CalendarView,
  tz: string,
): { from: Date; to: Date } | null {
  if (view === 'table') return null
  const anchor = anchorDate(cursor, tz)
  if (view === 'month') {
    return { from: startOfMonth(anchor), to: endOfMonth(anchor) }
  }
  if (view === 'week') {
    return {
      from: startOfWeek(anchor, WEEK_OPTS),
      to: endOfWeek(anchor, WEEK_OPTS),
    }
  }
  // day
  return { from: startOfDay(anchor), to: endOfDay(anchor) }
}

export function periodLabel(
  cursor: string,
  view: CalendarView,
  tz: string,
): string {
  if (view === 'table') return 'Tabela'
  const anchor = anchorDate(cursor, tz)
  if (view === 'month') {
    return format(anchor, 'MMMM yyyy', { locale: ptBR })
  }
  if (view === 'week') {
    const from = startOfWeek(anchor, WEEK_OPTS)
    const to = endOfWeek(anchor, WEEK_OPTS)
    const fromDay = format(from, 'd', { locale: ptBR })
    const toDay = format(to, 'd MMM yyyy', { locale: ptBR })
    return `${fromDay}–${toDay}`
  }
  // day
  return format(anchor, "EEE., d 'de' MMM yyyy", { locale: ptBR })
}

export function advancePeriod(
  cursor: string,
  view: CalendarView,
  direction: 1 | -1,
): string {
  const anchor = new Date(cursor + 'T12:00:00Z')
  let next: Date
  if (view === 'week') {
    next = addWeeks(anchor, direction)
  } else if (view === 'day') {
    next = addDays(anchor, direction)
  } else {
    next = addMonths(anchor, direction)
  }
  return next.toISOString().slice(0, 10)
}

/** Returns 35 or 42 Date objects (noon UTC each day) covering the full
 *  calendar grid for the month containing `cursor` in the given timezone.
 *  Using noon UTC means `formatInTimeZone(day, tz, 'yyyy-MM-dd')` always
 *  returns the correct calendar date for any ±12h timezone. */
export function calendarDays(cursor: string, tz: string): Date[] {
  const anchorStr = formatInTimeZone(
    new Date(cursor + 'T12:00:00Z'),
    tz,
    'yyyy-MM-dd',
  )
  const [year, month] = anchorStr.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const lastDay = new Date(Date.UTC(year, month - 1, daysInMonth))

  // Monday-first grid offsets
  const firstWeekday = firstDay.getUTCDay() // 0=Sun…6=Sat
  const startOffset = firstWeekday === 0 ? -6 : 1 - firstWeekday
  const lastWeekday = lastDay.getUTCDay()
  const endOffset = lastWeekday === 0 ? 0 : 7 - lastWeekday

  const gridStartDay = 1 + startOffset
  const gridEndDay = daysInMonth + endOffset
  const totalDays = gridEndDay - gridStartDay + 1

  return Array.from(
    { length: totalDays },
    (_, i) => new Date(Date.UTC(year, month - 1, gridStartDay + i, 12)),
  )
}

/** Formats a Date as "YYYY-MM-DD" in the given timezone. */
export function toCursorString(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, 'yyyy-MM-dd')
}

/**
 * Returns noon-UTC Date objects covering the period unit containing `cursor`.
 * Week view → 7 days (Mon–Sun); day view → 1 day.
 * Noon UTC is safe for any ±12h timezone: formatInTimeZone(noon, tz, 'yyyy-MM-dd')
 * always returns the correct local calendar date.
 */
export function periodDays(
  cursor: string,
  view: CalendarView,
  tz: string,
): Date[] {
  const anchorStr = formatInTimeZone(
    new Date(cursor + 'T12:00:00Z'),
    tz,
    'yyyy-MM-dd',
  )
  const [year, month, day] = anchorStr.split('-').map(Number)
  const anchorUtc = new Date(Date.UTC(year, month - 1, day, 12))
  if (view === 'day') return [anchorUtc]
  // week: Monday-first, 7 days
  const dow = anchorUtc.getUTCDay() // 0=Sun…6=Sat
  const startOffset = dow === 0 ? -6 : 1 - dow
  return Array.from(
    { length: 7 },
    (_, i) => new Date(Date.UTC(year, month - 1, day + startOffset + i, 12)),
  )
}
