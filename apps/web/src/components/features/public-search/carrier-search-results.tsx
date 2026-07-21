'use client'

import { Package, Star, Truck } from 'lucide-react'
import Link from 'next/link'

import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { EmptyState } from '~/components/ui/empty-state'
import { VEHICLE_TYPE_LABELS } from '~/components/features/shipments/shipment-labels'
import type { VehicleType } from '~/graphql/generated/types'
import { usePublicCarrierSearch } from '~/graphql/hooks/use-public-carrier-search'

interface CarrierSearchResultsProps {
  cityId: string
  vehicleType?: VehicleType
}

function registerHref(cityId: string, vehicleType?: VehicleType) {
  const params = new URLSearchParams({ role: 'CUSTOMER', cityId })
  if (vehicleType) params.set('vehicleType', vehicleType)
  return `/register?${params.toString()}`
}

export function CarrierSearchResults({
  cityId,
  vehicleType,
}: CarrierSearchResultsProps) {
  const { data: results = [], isLoading } = usePublicCarrierSearch({
    cityId,
    vehicleType,
  })

  const href = registerHref(cityId, vehicleType)

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">Buscando transportadores…</p>
    )
  }

  if (results.length === 0) {
    return (
      <EmptyState
        title="Nenhum transportador encontrado ainda nessa cidade"
        description="Cadastre-se mesmo assim — assim que criar o frete, entra na fila de propostas dos transportadores da região."
      >
        <Button asChild size="md">
          <Link href={href}>Quero contratar</Link>
        </Button>
      </EmptyState>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((carrier, index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-light text-brand-dark flex size-10 shrink-0 items-center justify-center rounded-full">
                <Truck className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-foreground truncate font-semibold">
                  {carrier?.firstName}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {carrier?.vehicleType
                    ? VEHICLE_TYPE_LABELS[carrier.vehicleType]
                    : '—'}
                </p>
              </div>
            </div>

            <div className="text-muted-foreground flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Star className="size-4" />
                {carrier?.avgRating != null
                  ? carrier.avgRating.toFixed(1)
                  : '—'}
              </span>
              <span className="flex items-center gap-1">
                <Package className="size-4" />
                {carrier?.totalShipments ?? 0} fretes
              </span>
            </div>

            <Button asChild size="sm" variant="outline">
              <Link href={href}>Quero contratar</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
