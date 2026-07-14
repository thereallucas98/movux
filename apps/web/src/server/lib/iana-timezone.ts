import { z } from 'zod'

export const ianaTimezone = z
  .string()
  .min(1)
  .refine(
    (tz) => {
      try {
        Intl.DateTimeFormat('en-US', { timeZone: tz })
        return true
      } catch {
        return false
      }
    },
    { message: 'Must be a valid IANA timezone (e.g. America/Sao_Paulo)' },
  )
