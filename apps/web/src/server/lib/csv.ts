/**
 * Minimal RFC-4180 CSV serializer (Task 13 research §5).
 *
 * No external dependency: the volume Task 13 produces is bounded
 * (≤ 50_000 rows, see EXPORT_TOO_LARGE) and the spec is small enough
 * to inline. Output uses CRLF line endings and a trailing CRLF.
 */

const NEEDS_QUOTE = /[",\r\n]/

export type CsvCell = string | number | boolean | null | undefined

function quote(value: string): string {
  if (!NEEDS_QUOTE.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

export function serializeRow(values: readonly CsvCell[]): string {
  return values
    .map((v) => {
      if (v === null || v === undefined) return ''
      if (typeof v === 'number' || typeof v === 'boolean') return String(v)
      return quote(v)
    })
    .join(',')
}

export function serializeCsv(
  headers: readonly string[],
  rows: readonly (readonly CsvCell[])[],
): string {
  const lines = [serializeRow(headers), ...rows.map((row) => serializeRow(row))]
  return lines.join('\r\n') + '\r\n'
}
