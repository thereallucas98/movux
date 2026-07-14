'use client'

import { useMediaQuery } from './use-media-query'

/**
 * True when viewport width is at most 720px — the project-wide mobile
 * breakpoint. Use for strict mobile UX (bottom sheets, sticky bottom bars).
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 720px)')
}
