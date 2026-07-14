'use client'

import { useMediaQuery } from './use-media-query'

/**
 * True when viewport width is at most 1023px — mobile plus tablet.
 * Use for components where iPad-class devices benefit from mobile treatment
 * (e.g., long option lists, sheet-over-popover patterns).
 */
export function useIsMobileOrTablet(): boolean {
  return useMediaQuery('(max-width: 1023px)')
}
