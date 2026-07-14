/**
 * Builds a single addressLine string from its parts.
 * Only includes parts that are non-empty.
 *
 * Examples:
 *   formatAddress({ street: 'Rua das Flores', number: '123' })
 *   → "Rua das Flores, 123"
 *
 *   formatAddress({ street: 'Rua das Flores', number: '123', complement: 'Apto 42' })
 *   → "Rua das Flores, 123, Apto 42"
 *
 *   formatAddress({ street: 'Rua das Flores' })
 *   → "Rua das Flores"
 */
export interface AddressParts {
  street?: string
  number?: string
  complement?: string
}

export function formatAddress(parts: AddressParts): string {
  return [parts.street, parts.number, parts.complement]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(', ')
}

/**
 * Parses a stored addressLine back into parts on a best-effort basis.
 * Splits on the first two commas:
 *   "Rua das Flores, 123, Apto 42" → { street, number, complement }
 *   "Rua das Flores, 123"          → { street, number }
 *   "Rua das Flores"               → { street }
 *
 * NOTE: this is best-effort — addresses that don't follow the pattern
 * will land entirely in `street`.
 */
export function parseAddressLine(addressLine: string): Required<AddressParts> {
  const parts = addressLine.split(',').map((p) => p.trim())
  return {
    street: parts[0] ?? '',
    number: parts[1] ?? '',
    complement: parts.slice(2).join(', '),
  }
}
