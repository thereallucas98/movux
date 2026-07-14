// ─── Types ────────────────────────────────────────────────────────────────────

export interface ViaCepResult {
  zipCode: string // raw 8-digit CEP
  addressLine: string // logradouro (may be empty)
  neighborhood: string // bairro (may be empty)
  city: string // localidade
  state: string // uf (2-letter abbreviation)
}

export type ViaCepLookupResult =
  | { success: true; data: ViaCepResult }
  | { success: false; code: 'NOT_FOUND' | 'INVALID_CEP' | 'NETWORK_ERROR' }

// ─── Raw API response ─────────────────────────────────────────────────────────

interface ViaCepRawResponse {
  erro?: boolean | string
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strips everything except digits from a CEP string. */
export function normalizeCep(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Normalizes a city name for fuzzy matching:
 * lowercases, trims, removes accents, and collapses extra spaces.
 */
export function normalizeCityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Looks up a Brazilian CEP via the ViaCEP public API.
 * Accepts CEP with or without hyphen (e.g. "58000-000" or "58000000").
 */
export async function lookupCep(cep: string): Promise<ViaCepLookupResult> {
  const digits = normalizeCep(cep)

  if (digits.length !== 8) {
    return { success: false, code: 'INVALID_CEP' }
  }

  let raw: ViaCepRawResponse

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return { success: false, code: 'NETWORK_ERROR' }
    }

    raw = (await res.json()) as ViaCepRawResponse
  } catch {
    return { success: false, code: 'NETWORK_ERROR' }
  }

  // ViaCEP returns { "erro": true } for unknown CEPs
  if (raw.erro) {
    return { success: false, code: 'NOT_FOUND' }
  }

  return {
    success: true,
    data: {
      zipCode: digits,
      addressLine: raw.logradouro?.trim() ?? '',
      neighborhood: raw.bairro?.trim() ?? '',
      city: raw.localidade?.trim() ?? '',
      state: raw.uf?.trim().toUpperCase() ?? '',
    },
  }
}
