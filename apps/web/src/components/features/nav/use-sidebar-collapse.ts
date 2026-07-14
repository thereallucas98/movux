'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

const STORAGE_KEY = 'movux.sidebar.collapsed'

export interface SidebarCollapseState {
  collapsed: boolean
  setCollapsed: Dispatch<SetStateAction<boolean>>
}

/**
 * Tracks the user's preferred desktop sidebar collapse state, persisted in
 * `localStorage`. On the server (and during the first client render before
 * hydration) the value is always `false` to avoid hydration mismatch — we
 * sync from storage in a `useEffect`.
 */
export function useSidebarCollapse(): SidebarCollapseState {
  const [collapsed, setCollapsed] = useState<boolean>(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw === '1') setCollapsed(true)
    } catch {
      // Access denied (private mode / SSR-only) — keep default.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      // Ignore write failures.
    }
  }, [collapsed])

  return { collapsed, setCollapsed }
}
