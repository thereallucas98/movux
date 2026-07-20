'use client'

import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { EmptyState } from '~/components/ui/empty-state'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { useMyShipments } from '~/graphql/hooks/use-my-shipments'
import { useMediaQuery } from '~/hooks/use-media-query'
import { formatPriceInCents } from '~/lib/format-price'
import { ShipmentStatusBadge } from './shipment-status-badge'
import { SHIPMENT_TYPE_LABELS } from './shipment-labels'

// scheduledDate é uma data pura (@db.Date), sempre serializada como meia-noite
// UTC — formatar com o fuso local (ex.: -03:00) volta um dia. Lê os
// componentes da data em UTC, não no fuso do navegador.
function formatScheduledDate(isoString: string): string {
  return formatInTimeZone(new Date(isoString), 'UTC', 'dd/MM/yyyy', {
    locale: ptBR,
  })
}

export function ShipmentsList({ limit }: { limit?: number } = {}) {
  const isMobile = useMediaQuery('(max-width: 720px)')
  const { data, isLoading, isError } = useMyShipments(limit ? { limit } : {})
  const shipments = data?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  // erro já vira toast global (QueryProvider) — aqui só evita confundir
  // "falhou ao carregar" com "não tem frete nenhum" (EmptyState abaixo)
  if (isError) {
    return (
      <EmptyState
        title="Não foi possível carregar seus fretes"
        description="Tente recarregar a página."
      />
    )
  }

  if (shipments.length === 0) {
    return (
      <EmptyState
        title="Nenhum frete ainda"
        description="Crie seu primeiro frete para começar."
      >
        <Button asChild>
          <Link href="/customer/shipments/new">Criar meu primeiro frete</Link>
        </Button>
      </EmptyState>
    )
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        {shipments.map((shipment) => (
          <Card key={shipment.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">
                {shipment.type ? SHIPMENT_TYPE_LABELS[shipment.type] : '—'}
              </CardTitle>
              {shipment.status && (
                <ShipmentStatusBadge status={shipment.status} />
              )}
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-muted-foreground">{shipment.description}</p>
              <p>
                {shipment.scheduledDate &&
                  formatScheduledDate(shipment.scheduledDate)}
              </p>
              <p className="font-semibold">
                {formatPriceInCents(
                  shipment.finalPriceInCents ??
                    shipment.suggestedPriceInCents ??
                    0,
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Preço</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shipments.map((shipment) => (
          <TableRow key={shipment.id}>
            <TableCell>
              {shipment.type ? SHIPMENT_TYPE_LABELS[shipment.type] : '—'}
            </TableCell>
            <TableCell className="max-w-xs truncate">
              {shipment.description}
            </TableCell>
            <TableCell>
              {shipment.scheduledDate &&
                formatScheduledDate(shipment.scheduledDate)}
            </TableCell>
            <TableCell>
              {shipment.status && (
                <ShipmentStatusBadge status={shipment.status} />
              )}
            </TableCell>
            <TableCell className="text-right">
              {formatPriceInCents(
                shipment.finalPriceInCents ??
                  shipment.suggestedPriceInCents ??
                  0,
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
