'use client'

import { Package, ShieldCheck, Star, Truck } from 'lucide-react'

import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { EmptyState } from '~/components/ui/empty-state'
import { Skeleton } from '~/components/ui/skeleton'
import { usePublicCarrierPortfolio } from '~/graphql/hooks/use-public-carrier-portfolio'
import { getReputationTier } from '~/lib/reputation-tier'

export function CarrierPortfolioView({ userId }: { userId: string }) {
  const {
    data: carrier,
    isLoading,
    isError,
  } = usePublicCarrierPortfolio(userId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !carrier) {
    return (
      <EmptyState
        title="Transportador não encontrado"
        description="Esse perfil não existe ou não está mais disponível na busca pública."
      />
    )
  }

  const tier = getReputationTier(carrier.avgRating)

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="bg-brand-light text-brand-dark flex size-14 shrink-0 items-center justify-center rounded-full">
            <Truck className="size-7" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-foreground text-xl font-bold">
                {carrier.fullName}
              </h1>
              <Badge variant="success">
                <ShieldCheck className="mr-1 size-3" />
                Verificado
              </Badge>
              {tier && <Badge variant={tier.variant}>{tier.label}</Badge>}
              {carrier.topTagLabel && (
                <Badge variant="outline">{carrier.topTagLabel}</Badge>
              )}
            </div>
            <div className="text-muted-foreground flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Star className="size-4" />
                {carrier.avgRating != null ? carrier.avgRating.toFixed(1) : '—'}
              </span>
              <span className="flex items-center gap-1">
                <Package className="size-4" />
                {carrier.totalShipments} fretes
              </span>
            </div>
            {carrier.bio && (
              <p className="text-foreground pt-1 text-sm">{carrier.bio}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Veículos</CardTitle>
        </CardHeader>
        <CardContent>
          {!carrier.vehicles || carrier.vehicles.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum veículo ativo no momento.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {carrier.vehicles.map((vehicle) => (
                <li
                  key={vehicle.id}
                  className="border-border rounded-md border p-3 text-sm"
                >
                  <p className="text-foreground font-medium">
                    {vehicle.brandName} {vehicle.modelName}
                  </p>
                  <p className="text-muted-foreground">
                    {vehicle.categoryName} · {vehicle.year}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
