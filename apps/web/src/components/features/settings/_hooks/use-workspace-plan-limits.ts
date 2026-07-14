'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError } from '~/lib/api-error'
import type { WorkspacePlanLimitsData } from '~/server/use-cases/workspaces/get-workspace-plan-limits.use-case'

async function fetchWorkspacePlanLimits(
  workspaceId: string,
): Promise<WorkspacePlanLimitsData> {
  const res = await fetch(`/api/workspaces/${workspaceId}/plan-limits`, {
    credentials: 'include',
  })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<WorkspacePlanLimitsData>
}

export function useWorkspacePlanLimits(workspaceId: string | null) {
  return useQuery({
    queryKey: ['plan-limits', 'workspace', workspaceId] as const,
    queryFn: () => fetchWorkspacePlanLimits(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    meta: { silent: true },
  })
}
