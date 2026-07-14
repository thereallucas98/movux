import { addDays, endOfDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

/**
 * Returns the `[start of today, end of today+7d]` range, both expressed in the
 * given IANA timezone but encoded as UTC `Date` instances (so callers can hand
 * them to Prisma/SQL directly).
 */
export function nextWeekRange(
  timezone: string,
  now: Date = new Date(),
): { fromAt: Date; toAt: Date } {
  const zonedNow = toZonedTime(now, timezone)
  const fromAt = startOfDay(zonedNow)
  const toAt = endOfDay(addDays(zonedNow, 7))
  return { fromAt, toAt }
}

/** Format a shift start as "28 abr · 07:00" in the workspace timezone. */
export function formatShiftStartLabel(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "dd MMM '·' HH:mm", { locale: ptBR })
}

/** Returns "83%" rounded, or em-dash when total === 0. */
export function formatPercent(filled: number, total: number): string {
  if (total === 0) return '—'
  return `${Math.round((filled / total) * 100)}%`
}
