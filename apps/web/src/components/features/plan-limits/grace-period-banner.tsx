'use client'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock } from 'lucide-react'
import Link from 'next/link'

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { useTenantPlanLimits } from '~/components/features/settings/_hooks/use-tenant-plan-limits'

export interface GracePeriodBannerProps {
  tenantId: string
}

export function GracePeriodBanner({ tenantId }: GracePeriodBannerProps) {
  const { data } = useTenantPlanLimits(tenantId)
  if (!data) return null

  const grace = data.gracePeriodUntil
  if (!grace) return null

  const expiresAt = new Date(grace)
  if (expiresAt <= new Date()) return null

  const countdown = formatDistanceToNow(expiresAt, { locale: ptBR })

  return (
    <Alert variant="warning" role="status" className="rounded-none border-x-0">
      <Clock className="h-4 w-4" />
      <AlertTitle>Plano em período de grace</AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Você está acima do limite do plano {data.plan}. Reduza recursos ou
          faça upgrade — grace expira em {countdown}.
        </span>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/billing">Resolver</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
