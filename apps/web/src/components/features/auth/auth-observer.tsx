'use client'

import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface QueryErrorWithStatus {
  status?: number
  response?: { status?: number }
}

function isUnauthorized(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as QueryErrorWithStatus
  return e.status === 401 || e.response?.status === 401
}

/**
 * Listens for two signals to handle mid-session 401s without forcing manual
 * reload:
 *
 *   1. React Query cache updates whose error has status 401
 *   2. Custom `movux:401` window event dispatched by `lib/api-client`
 *      interceptors
 *
 * Both feed a single 300ms-debounced handler that pushes the user to
 * `/login?redirectTo=<pathname>`.
 */
export function AuthObserver() {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    function handle() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const target = `/login?redirectTo=${encodeURIComponent(pathname || '/')}`
        router.replace(target)
      }, 300)
    }

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return
      if (isUnauthorized(event.query.state.error)) {
        handle()
      }
    })

    window.addEventListener('movux:401', handle)

    return () => {
      unsubscribe()
      window.removeEventListener('movux:401', handle)
      if (timer) clearTimeout(timer)
    }
  }, [router, pathname, queryClient])

  return null
}
