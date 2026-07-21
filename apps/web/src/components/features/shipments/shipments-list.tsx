'use client'

import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { EmptyState } from '~/components/ui/empty-state'
import { IconButton } from '~/components/ui/icon-button'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import type {
  MyShipmentsQuery,
  ShipmentStatus,
} from '~/graphql/generated/types'
import { useMyShipments } from '~/graphql/hooks/use-my-shipments'
import { useMediaQuery } from '~/hooks/use-media-query'
import { formatPriceInCents } from '~/lib/format-price'
import { ShipmentFilterSheet } from './shipment-filter-sheet'
import { ShipmentStatusBadge } from './shipment-status-badge'
import { SHIPMENT_TYPE_LABELS } from './shipment-labels'
import { ShipmentTypeIcon } from './shipment-type-icon'

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
  const [status, setStatus] = useState<ShipmentStatus | undefined>()
  const [filterOpen, setFilterOpen] = useState(false)

  // limit definido = preview (dashboard) — sem controle de filtro ali
  const showFilter = limit === undefined

  const { data, isLoading, isError } = useMyShipments({ status, limit })
  const shipments = data?.data ?? []

  return (
    <div className="space-y-3">
      {showFilter && (
        <div className="flex items-center justify-end gap-2">
          {status && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStatus(undefined)}
            >
              Limpar filtro
            </Button>
          )}
          <IconButton
            type="button"
            variant="outline"
            aria-label="Filtrar por status"
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal />
          </IconButton>
        </div>
      )}

      <ShipmentContent
        isLoading={isLoading}
        isError={isError}
        shipments={shipments}
        isMobile={isMobile}
      />

      <ShipmentFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        value={status}
        onApply={setStatus}
      />
    </div>
  )
}

type ShipmentListItem = NonNullable<
  NonNullable<MyShipmentsQuery['myShipments']>['data']
>[number]

interface ShipmentContentProps {
  isLoading: boolean
  isError: boolean
  shipments: ShipmentListItem[]
  isMobile: boolean
}

function ShipmentContent({
  isLoading,
  isError,
  shipments,
  isMobile,
}: ShipmentContentProps) {
  const router = useRouter()

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
        {shipments.map(
          (shipment) =>
            shipment.id && (
              <Link
                key={shipment.id}
                href={`/customer/shipments/${shipment.id}`}
              >
                <Card className="hover:border-primary transition-colors">
                  <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
                    {shipment.type && <ShipmentTypeIcon type={shipment.type} />}
                    <CardTitle className="flex-1 text-base">
                      {shipment.type
                        ? SHIPMENT_TYPE_LABELS[shipment.type]
                        : '—'}
                    </CardTitle>
                    {shipment.status && (
                      <ShipmentStatusBadge status={shipment.status} />
                    )}
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      {shipment.description}
                    </p>
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
              </Link>
            ),
        )}
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
        {shipments.map(
          (shipment) =>
            shipment.id && (
              <TableRow
                key={shipment.id}
                className="hover:bg-muted cursor-pointer"
                onClick={() =>
                  router.push(`/customer/shipments/${shipment.id}`)
                }
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {shipment.type && (
                      <ShipmentTypeIcon
                        type={shipment.type}
                        className="size-8"
                      />
                    )}
                    {shipment.type ? SHIPMENT_TYPE_LABELS[shipment.type] : '—'}
                  </div>
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
            ),
        )}
      </TableBody>
    </Table>
  )
}
