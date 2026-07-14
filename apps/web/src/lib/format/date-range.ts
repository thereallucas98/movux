import { ptBR } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'

function getYear(date: Date, timezone: string): number {
  return Number(formatInTimeZone(date, timezone, 'yyyy'))
}

function getMonth(date: Date, timezone: string): number {
  return Number(formatInTimeZone(date, timezone, 'M'))
}

/**
 * Format a single date in PT-BR ("01 mai" or "30 dez 2025").
 * Year is appended only when not the current calendar year (or when forced).
 */
export function formatDateShort(
  date: Date,
  timezone: string,
  opts?: { withYear?: boolean },
): string {
  const currentYear = new Date().getUTCFullYear()
  const dateYear = getYear(date, timezone)
  const showYear = opts?.withYear ?? dateYear !== currentYear
  const fmt = showYear ? 'dd MMM yyyy' : 'dd MMM'
  return formatInTimeZone(date, timezone, fmt, { locale: ptBR })
}

/**
 * Format a closed period range in PT-BR. Branches on whether `from` and `to`
 * share month/year:
 *   - same year + same month: "01 – 15 mai"
 *   - same year + different months: "01 mai – 30 jun"
 *   - different years: "30 dez 2025 – 05 jan 2026"
 */
export function formatPeriodRange(
  from: Date,
  to: Date,
  timezone: string,
): string {
  const sameYear = getYear(from, timezone) === getYear(to, timezone)
  const sameMonth =
    sameYear && getMonth(from, timezone) === getMonth(to, timezone)

  if (!sameYear) {
    return `${formatDateShort(from, timezone, { withYear: true })} – ${formatDateShort(to, timezone, { withYear: true })}`
  }
  if (sameMonth) {
    const dayFrom = formatInTimeZone(from, timezone, 'dd')
    return `${dayFrom} – ${formatDateShort(to, timezone)}`
  }
  return `${formatDateShort(from, timezone)} – ${formatDateShort(to, timezone)}`
}
