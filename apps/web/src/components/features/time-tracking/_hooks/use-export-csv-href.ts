'use client'

import type { TimeEntriesFilters } from './use-time-entries'

export function useExportCsvHref(
  workspaceId: string,
  filters: TimeEntriesFilters,
): string {
  if (typeof window === 'undefined') return ''
  const url = new URL(
    `/api/workspaces/${workspaceId}/time-entries`,
    window.location.origin,
  )
  url.searchParams.set('format', 'csv')
  if (filters.from) url.searchParams.set('from', filters.from.toISOString())
  if (filters.to) url.searchParams.set('to', filters.to.toISOString())
  if (filters.userId) url.searchParams.set('userId', filters.userId)
  return url.toString()
}
