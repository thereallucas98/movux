'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { useConfirmSafetyCheckIn } from '~/graphql/hooks/use-confirm-safety-check-in'
import { useMarkCollected } from '~/graphql/hooks/use-mark-collected'
import { useMarkDelivered } from '~/graphql/hooks/use-mark-delivered'
import { useMarkInTransit } from '~/graphql/hooks/use-mark-in-transit'
import { useReviewsForShipment } from '~/graphql/hooks/use-reviews-for-shipment'
import { useSafetyCheckInStatus } from '~/graphql/hooks/use-safety-check-in-status'
import { useSetShipmentEta } from '~/graphql/hooks/use-set-shipment-eta'
import { useSubmitReview } from '~/graphql/hooks/use-submit-review'
import type { ShipmentStatus } from '~/graphql/generated/types'
import { ReviewTagPicker } from './review-tag-picker'

interface Props {
  shipmentId: string
  status: ShipmentStatus
  collectionEtaMinutes: number | null
  deliveryEtaMinutes: number | null
}

/** Segunda metade do lifecycle, do lado do carrier — mesma motivação de
 * `customer-shipment-actions.tsx` (backend pronto desde Sprint 3, sem UI). */
export function CarrierShipmentTransitActions({
  shipmentId,
  status,
  collectionEtaMinutes,
  deliveryEtaMinutes,
}: Props) {
  if (status === 'CARRIER_SELECTED') {
    return (
      <CollectFlow shipmentId={shipmentId} etaMinutes={collectionEtaMinutes} />
    )
  }
  if (status === 'COLLECTED') {
    return <TransitButton shipmentId={shipmentId} />
  }
  if (status === 'IN_TRANSIT') {
    return (
      <DeliverButton shipmentId={shipmentId} etaMinutes={deliveryEtaMinutes} />
    )
  }
  if (status === 'DELIVERED' || status === 'REVIEWED') {
    return <ReviewCard shipmentId={shipmentId} />
  }
  return null
}

// Achado #9 da QA momento-zero: carrier informa uma estimativa de chegada
// (minutos) pra coleta e, depois, outra pra entrega — dois valores
// independentes, cada um só editável na etapa correspondente do frete.
function EtaField({
  stage,
  shipmentId,
  etaMinutes,
  label,
}: {
  stage: 'COLLECTION' | 'DELIVERY'
  shipmentId: string
  etaMinutes: number | null
  label: string
}) {
  const setEta = useSetShipmentEta()
  const [value, setValue] = useState(etaMinutes ? String(etaMinutes) : '')

  const parsed = Number(value)
  const isValid = value.trim() !== '' && Number.isInteger(parsed) && parsed > 0

  return (
    <div className="space-y-2">
      <Label htmlFor={`eta-${stage}`}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={`eta-${stage}`}
          inputMode="numeric"
          className="min-h-12 max-w-32"
          placeholder="Minutos"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!isValid || setEta.isPending}
          onClick={() =>
            setEta.mutate({ shipmentId, stage, etaMinutes: parsed })
          }
        >
          {setEta.isPending ? 'Salvando…' : 'Atualizar'}
        </Button>
      </div>
      {etaMinutes !== null && (
        <p className="text-muted-foreground text-xs">
          Previsto atualmente: {etaMinutes} min
        </p>
      )}
    </div>
  )
}

function CollectFlow({
  shipmentId,
  etaMinutes,
}: {
  shipmentId: string
  etaMinutes: number | null
}) {
  const { data: safety } = useSafetyCheckInStatus(shipmentId)
  const confirm = useConfirmSafetyCheckIn()
  const collect = useMarkCollected()

  const confirmed = Boolean(safety?.carrier)
  const bothConfirmed = Boolean(safety?.customer) && Boolean(safety?.carrier)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Check-in de segurança</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Você: {confirmed ? 'confirmado' : 'pendente'} · Cliente:{' '}
          {safety?.customer ? 'confirmado' : 'pendente'}
        </p>
        {!confirmed && (
          <Button
            size="sm"
            disabled={confirm.isPending}
            onClick={() => confirm.mutate(shipmentId)}
          >
            Confirmar check-in
          </Button>
        )}
        {confirmed && (
          <>
            <EtaField
              stage="COLLECTION"
              shipmentId={shipmentId}
              etaMinutes={etaMinutes}
              label="Hora prevista de chegada (coleta)"
            />
            <Button
              size="sm"
              disabled={!bothConfirmed || collect.isPending}
              onClick={() => collect.mutate(shipmentId)}
            >
              Marcar como coletado
            </Button>
          </>
        )}
        {confirmed && !bothConfirmed && (
          <p className="text-muted-foreground text-xs">
            Aguardando o check-in do cliente pra liberar a coleta.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function TransitButton({ shipmentId }: { shipmentId: string }) {
  const transit = useMarkInTransit()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Em trânsito</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          disabled={transit.isPending}
          onClick={() => transit.mutate(shipmentId)}
        >
          Marcar como em trânsito
        </Button>
      </CardContent>
    </Card>
  )
}

function DeliverButton({
  shipmentId,
  etaMinutes,
}: {
  shipmentId: string
  etaMinutes: number | null
}) {
  const deliver = useMarkDelivered()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Entrega</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <EtaField
          stage="DELIVERY"
          shipmentId={shipmentId}
          etaMinutes={etaMinutes}
          label="Hora prevista de chegada (entrega)"
        />
        <Button
          size="sm"
          disabled={deliver.isPending}
          onClick={() => deliver.mutate(shipmentId)}
        >
          Marcar como entregue
        </Button>
      </CardContent>
    </Card>
  )
}

function ReviewCard({ shipmentId }: { shipmentId: string }) {
  const { data: reviews = [] } = useReviewsForShipment(shipmentId)
  const submitReview = useSubmitReview()
  const [rating, setRating] = useState(0)
  const [tagIds, setTagIds] = useState<string[]>([])

  const alreadyReviewed = reviews.some((r) => r?.reviewerRole === 'CARRIER')

  if (alreadyReviewed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avaliação</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Você já avaliou esse frete. Obrigado!
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Avalie o cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
              onClick={() => setRating(n)}
            >
              <Star
                className={
                  n <= rating
                    ? 'text-warning fill-warning size-6'
                    : 'text-muted-foreground size-6'
                }
              />
            </button>
          ))}
        </div>
        <ReviewTagPicker
          targetRole="CUSTOMER"
          value={tagIds}
          onChange={setTagIds}
          disabled={submitReview.isPending}
        />
        <Button
          size="sm"
          disabled={rating === 0 || submitReview.isPending}
          onClick={() => submitReview.mutate({ shipmentId, rating, tagIds })}
        >
          Enviar avaliação
        </Button>
      </CardContent>
    </Card>
  )
}
