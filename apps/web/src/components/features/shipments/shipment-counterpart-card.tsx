'use client'

import { Phone, Star } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useShipmentCounterpartInfo } from '~/graphql/hooks/use-shipment-counterpart-info'
import { getReputationTier } from '~/lib/reputation-tier'

interface Props {
  shipmentId: string
  role: 'CUSTOMER' | 'CARRIER'
}

const TITLE: Record<Props['role'], string> = {
  CUSTOMER: 'Transportador',
  CARRIER: 'Cliente',
}

/**
 * Cartão de contato da contraparte (item #1 do review Metrobi, D-007).
 * A query já devolve a contraparte certa a partir do papel autenticado —
 * customer vê o transportador, carrier vê o cliente. Telefone só aparece
 * depois de um clique explícito.
 */
export function ShipmentCounterpartCard({ shipmentId, role }: Props) {
  const { data: info } = useShipmentCounterpartInfo(shipmentId)
  const [phoneRevealed, setPhoneRevealed] = useState(false)

  if (!info) return null

  const tier = getReputationTier(info.avgRating)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{TITLE[role]}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{info.fullName}</p>
          {info.avgRating != null && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Star className="text-warning fill-warning size-4" />
              {info.avgRating.toFixed(1)}
            </span>
          )}
        </div>
        {(tier || info.topTagLabel) && (
          <div className="flex flex-wrap gap-2">
            {tier && <Badge variant={tier.variant}>{tier.label}</Badge>}
            {info.topTagLabel && (
              <Badge variant="outline">{info.topTagLabel}</Badge>
            )}
          </div>
        )}
        {info.phone &&
          (phoneRevealed ? (
            <p className="flex items-center gap-2">
              <Phone className="text-muted-foreground size-4" />
              {info.phone}
            </p>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPhoneRevealed(true)}
            >
              Mostrar telefone
            </Button>
          ))}
      </CardContent>
    </Card>
  )
}
