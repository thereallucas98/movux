'use client'

import { useMemo } from 'react'

interface UseGeolocationReturn {
  supported: boolean
  getLocation: () => Promise<{ lat: number; lng: number } | null>
}

/**
 * Best-effort browser geolocation. Returns null on unsupported browser,
 * permission denial, or 10-second timeout. Caller proceeds without lat/lng.
 */
export function useGeolocation(): UseGeolocationReturn {
  return useMemo(() => {
    const supported =
      typeof window !== 'undefined' && 'geolocation' in window.navigator

    function getLocation(): Promise<{ lat: number; lng: number } | null> {
      if (!supported) return Promise.resolve(null)
      return new Promise((resolve) => {
        let settled = false
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true
            resolve(null)
          }
        }, 10_000)

        window.navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            })
          },
          () => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            resolve(null)
          },
          {
            enableHighAccuracy: false,
            maximumAge: 60_000,
            timeout: 10_000,
          },
        )
      })
    }

    return { supported, getLocation }
  }, [])
}
