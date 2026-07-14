'use client'

import { AlertTriangle, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { useWorkspacePlanLimits } from '~/components/features/settings/_hooks/use-workspace-plan-limits'
import type { WorkspacePlanLimitsData } from '~/server/use-cases/workspaces/get-workspace-plan-limits.use-case'

import { getBannerState } from './get-banner-state'

type WorkspaceResourceKey = keyof WorkspacePlanLimitsData['resources']

const RESOURCE_LABELS: Record<WorkspaceResourceKey, string> = {
  members: 'membros',
  categories: 'setores',
  specialties: 'especialidades',
  activeSchedules: 'escalas ativas',
  shiftsThisMonth: 'plantões/mês',
  requestsThisMonth: 'solicitações/mês',
  storageMB: 'armazenamento (MB)',
}

export interface PlanLimitBannerProps {
  workspaceId: string
  resource: WorkspaceResourceKey
}

export function PlanLimitBanner({
  workspaceId,
  resource,
}: PlanLimitBannerProps) {
  const { data } = useWorkspacePlanLimits(workspaceId)
  if (!data) return null

  const slot = data.resources[resource]
  if (!slot) return null

  const state = getBannerState(slot.current, slot.limit)
  if (state === 'hidden') return null

  const label = RESOURCE_LABELS[resource]
  const variant = state === 'destructive' ? 'destructive' : 'warning'
  const Icon = state === 'destructive' ? ShieldAlert : AlertTriangle

  return (
    <Alert
      variant={variant}
      role={state === 'destructive' ? 'alert' : 'status'}
    >
      <Icon className="h-4 w-4" />
      <AlertTitle>
        {state === 'destructive'
          ? `Limite atingido — ${label}`
          : `Próximo do limite — ${label}`}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {slot.current} de {slot.limit} usado(s) no plano {data.plan}
          {slot.percent !== null && ` (${slot.percent}%).`}
        </span>
        <Button
          asChild
          variant={state === 'destructive' ? 'destructive' : 'outline'}
          size="sm"
        >
          <Link href="/settings/billing">Fazer upgrade</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
