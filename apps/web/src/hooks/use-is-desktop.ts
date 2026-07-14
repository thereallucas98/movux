'use client'

import { useMediaQuery } from './use-media-query'

/**
 * True when viewport width is at least 1024px — aligned with Tailwind's `lg`
 * breakpoint and the AppShell sidebar/bottom-tabs split.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
