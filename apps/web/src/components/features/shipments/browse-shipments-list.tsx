'use client'

import { useMemo, useState } from 'react'
import { AdaptiveSelect } from '~/components/ui/adaptive-select'
import { Button } from '~/components/ui/button'
import { EmptyState } from '~/components/ui/empty-state'
import { Skeleton } from '~/components/ui/skeleton'
import { useBrowseShipments } from '~/graphql/hooks/use-browse-shipments'
import { useNeighborhoods } from '~/graphql/hooks/use-neighborhoods'
import type { ShipmentType } from '~/graphql/generated/types'
import { BrowseShipmentCard } from './browse-shipment-card'
import { SHIPMENT_TYPE_LABELS } from './shipment-labels'

const SHIPMENT_TYPE_OPTIONS = Object.entries(SHIPMENT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
)

export function BrowseShipmentsList({ limit }: { limit?: number } = {}) {
  const [cityId, setCityId] = useState<string | undefined>()
  const [type, setType] = useState<ShipmentType | undefined>()

  const { data: neighborhoods = [] } = useNeighborhoods()
  // Não existe uma query dedicada de cidades — deriva as opções direto do
  // catálogo de bairros já carregado (mesmo dado usado no form de criação
  // de frete do customer, S8-T1), sem endpoint novo.
  const cityOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const n of neighborhoods) {
      if (!seen.has(n.cityId)) seen.set(n.cityId, n.cityName)
    }
    return Array.from(seen, ([value, label]) => ({ value, label }))
  }, [neighborhoods])

  const { data, isLoading, isError } = useBrowseShipments({
    cityId,
    type,
    ...(limit ? { limit } : {}),
  })
  const shipments = data?.data ?? []
  const hasFilter = Boolean(cityId || type)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <AdaptiveSelect
          options={cityOptions}
          getOptionValue={(o) => o.value}
          getOptionLabel={(o) => o.label}
          value={cityId}
          onValueChange={setCityId}
          placeholder="Todas as cidades"
        />
        <AdaptiveSelect
          options={SHIPMENT_TYPE_OPTIONS}
          getOptionValue={(o) => o.value}
          getOptionLabel={(o) => o.label}
          value={type}
          onValueChange={(v) => setType(v as ShipmentType)}
          placeholder="Todos os tipos"
        />
        {hasFilter && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setCityId(undefined)
              setType(undefined)
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!isLoading && isError && (
        <EmptyState
          title="Não foi possível carregar os fretes"
          description="Tente recarregar a página."
        />
      )}

      {!isLoading && !isError && shipments.length === 0 && (
        <EmptyState
          title="Nenhum frete disponível"
          description="Não há fretes abertos com esse filtro no momento."
        />
      )}

      {!isLoading && !isError && shipments.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shipments.map(
            (shipment) =>
              shipment.id && (
                <BrowseShipmentCard key={shipment.id} shipment={shipment} />
              ),
          )}
        </div>
      )}
    </div>
  )
}
