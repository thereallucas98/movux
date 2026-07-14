'use client'

import { useSyncExternalStore } from 'react'

/**
 * SSR-safe media query hook.
 * Uses useSyncExternalStore so the initial server snapshot is always `false`
 * (no hydration mismatch) and the client subscribes to matchMedia changes.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', callback)
      return () => media.removeEventListener('change', callback)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
