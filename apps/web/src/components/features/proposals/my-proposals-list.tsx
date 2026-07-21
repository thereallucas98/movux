'use client'

import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { EmptyState } from '~/components/ui/empty-state'
import { Skeleton } from '~/components/ui/skeleton'
import { SHIPMENT_TYPE_LABELS } from '~/components/features/shipments/shipment-labels'
import { ShipmentTypeIcon } from '~/components/features/shipments/shipment-type-icon'
import { useMyProposals } from '~/graphql/hooks/use-my-proposals'
import { formatPriceInCents } from '~/lib/format-price'
import { ProposalStatusBadge } from './proposal-status-badge'
import { QueueStatusBadge } from './queue-status-badge'
import { ShipmentActionButton } from './shipment-action-button'

// scheduledDate é uma data pura (@db.Date) — mesmo padrão UTC-anchored do
// resto do projeto (shipments-list.tsx, browse-shipment-card.tsx).
function formatScheduledDate(isoString: string): string {
  return formatInTimeZone(new Date(isoString), 'UTC', 'dd/MM/yyyy', {
    locale: ptBR,
  })
}

export function MyProposalsList({ limit }: { limit?: number } = {}) {
  const router = useRouter()
  const { data, isLoading, isError } = useMyProposals(limit ? { limit } : {})
  const entries = data?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Não foi possível carregar suas propostas"
        description="Tente recarregar a página."
      />
    )
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Nenhuma proposta ainda"
        description="Entre na fila de um frete aberto pra começar."
      >
        <Button asChild>
          <Link href="/carrier/shipments">Buscar fretes</Link>
        </Button>
      </EmptyState>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        if (!entry.id || !entry.shipment?.id) return null

        const attempts = entry.proposal?.attempts ?? []
        const latestPrice =
          attempts[attempts.length - 1]?.priceInCents ??
          entry.shipment.suggestedPriceInCents ??
          0

        return (
          <Card
            key={entry.id}
            className="hover:border-primary cursor-pointer transition-colors"
            onClick={() =>
              entry.shipment?.id &&
              router.push(`/carrier/shipments/${entry.shipment.id}`)
            }
          >
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                {entry.shipment.type && (
                  <ShipmentTypeIcon type={entry.shipment.type} />
                )}
                <CardTitle className="text-base">
                  {entry.shipment.type
                    ? SHIPMENT_TYPE_LABELS[entry.shipment.type]
                    : '—'}
                </CardTitle>
              </div>
              <div className="flex gap-2">
                {entry.status && <QueueStatusBadge status={entry.status} />}
                {entry.proposal?.status && (
                  <ProposalStatusBadge status={entry.proposal.status} />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {entry.shipment.description}
              </p>
              <p>
                {entry.shipment.scheduledDate &&
                  formatScheduledDate(entry.shipment.scheduledDate)}
              </p>
              <p className="font-semibold">{formatPriceInCents(latestPrice)}</p>
            </CardContent>
            <CardFooter onClick={(e) => e.stopPropagation()}>
              <ShipmentActionButton shipmentId={entry.shipment.id} />
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
