'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { useAcceptProposal } from '~/graphql/hooks/use-accept-proposal'
import { useConfirmDelivery } from '~/graphql/hooks/use-confirm-delivery'
import { useConfirmSafetyCheckIn } from '~/graphql/hooks/use-confirm-safety-check-in'
import { useDeliveryConfirmationStatus } from '~/graphql/hooks/use-delivery-confirmation-status'
import { usePublishShipment } from '~/graphql/hooks/use-publish-shipment'
import { useProposalsForShipment } from '~/graphql/hooks/use-proposals-for-shipment'
import { useRejectProposal } from '~/graphql/hooks/use-reject-proposal'
import { useReviewsForShipment } from '~/graphql/hooks/use-reviews-for-shipment'
import { useSafetyCheckInStatus } from '~/graphql/hooks/use-safety-check-in-status'
import { useSubmitReview } from '~/graphql/hooks/use-submit-review'
import { formatPriceInCents } from '~/lib/format-price'
import type { ShipmentStatus } from '~/graphql/generated/types'

interface Props {
  shipmentId: string
  status: ShipmentStatus
}

/**
 * Segunda metade do lifecycle do frete (publicar → aceitar proposta →
 * check-in → confirmar entrega → avaliar), do lado do customer. O backend
 * (use-cases + REST) existe desde os Sprints 1-4; nunca tinha sido exposto
 * no GraphQL nem tinha UI — só a fila/proposta/documentos migraram no
 * Sprint 8. Um card por fase, só a fase relevante pro status atual renderiza.
 */
export function CustomerShipmentActions({ shipmentId, status }: Props) {
  if (status === 'DRAFT') {
    return <PublishCard shipmentId={shipmentId} />
  }
  if (status === 'OPEN' || status === 'PROPOSALS_RECEIVED') {
    return <ProposalsCard shipmentId={shipmentId} />
  }
  if (status === 'CARRIER_SELECTED') {
    return <SafetyCheckInCard shipmentId={shipmentId} />
  }
  if (status === 'DELIVERED') {
    return (
      <>
        <DeliveryConfirmationCard shipmentId={shipmentId} />
        <ReviewCard shipmentId={shipmentId} role="CUSTOMER" />
      </>
    )
  }
  if (status === 'REVIEWED') {
    return <ReviewCard shipmentId={shipmentId} role="CUSTOMER" />
  }
  return null
}

function PublishCard({ shipmentId }: { shipmentId: string }) {
  const publish = usePublishShipment()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Esse frete ainda está em rascunho — transportadores só veem depois
          de publicado.
        </p>
        <Button
          size="sm"
          disabled={publish.isPending}
          onClick={() => publish.mutate(shipmentId)}
        >
          {publish.isPending ? 'Publicando…' : 'Publicar frete'}
        </Button>
      </CardContent>
    </Card>
  )
}

function ProposalsCard({ shipmentId }: { shipmentId: string }) {
  const { data: proposals = [], isLoading } = useProposalsForShipment(shipmentId)
  const accept = useAcceptProposal()
  const reject = useRejectProposal()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Propostas recebidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <p className="text-muted-foreground text-sm">Carregando…</p>
        )}
        {!isLoading && proposals.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nenhuma proposta ainda — transportadores da região já podem ver
            esse frete.
          </p>
        )}
        {proposals.map((proposal) =>
          proposal ? (
            <div
              key={proposal.id}
              className="border-border flex items-center justify-between gap-3 rounded-[10px] border p-3 text-sm"
            >
              <div>
                <p className="font-semibold">{proposal.carrierName}</p>
                <p className="text-muted-foreground">
                  {formatPriceInCents(proposal.priceInCents ?? 0)}
                </p>
              </div>
              {proposal.status === 'ACTIVE' && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    disabled={accept.isPending}
                    onClick={() =>
                      accept.mutate({
                        shipmentId,
                        proposalId: proposal.id ?? '',
                      })
                    }
                  >
                    Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reject.isPending}
                    onClick={() =>
                      reject.mutate({
                        shipmentId,
                        proposalId: proposal.id ?? '',
                      })
                    }
                  >
                    Recusar
                  </Button>
                </div>
              )}
            </div>
          ) : null,
        )}
      </CardContent>
    </Card>
  )
}

function SafetyCheckInCard({ shipmentId }: { shipmentId: string }) {
  const { data: status } = useSafetyCheckInStatus(shipmentId)
  const confirm = useConfirmSafetyCheckIn()
  const confirmed = Boolean(status?.customer)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Check-in de segurança</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Você: {confirmed ? 'confirmado' : 'pendente'} · Transportador:{' '}
          {status?.carrier ? 'confirmado' : 'pendente'}
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
      </CardContent>
    </Card>
  )
}

function DeliveryConfirmationCard({ shipmentId }: { shipmentId: string }) {
  const { data: confirmation } = useDeliveryConfirmationStatus(shipmentId)
  const confirmDelivery = useConfirmDelivery()

  if (confirmation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entrega</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {confirmation.confirmed
            ? 'Entrega confirmada.'
            : `Problema reportado: ${confirmation.issueDescription ?? '—'}`}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Confirme a entrega</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          O transportador marcou esse frete como entregue. Confirma que
          chegou tudo certo?
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={confirmDelivery.isPending}
            onClick={() =>
              confirmDelivery.mutate({ shipmentId, input: { confirmed: true } })
            }
          >
            Confirmar entrega
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={confirmDelivery.isPending}
            onClick={() =>
              confirmDelivery.mutate({
                shipmentId,
                input: {
                  confirmed: false,
                  issueDescription: 'Problema reportado pelo cliente',
                },
              })
            }
          >
            Reportar problema
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewCard({
  shipmentId,
  role,
}: {
  shipmentId: string
  role: 'CUSTOMER' | 'CARRIER'
}) {
  const { data: reviews = [] } = useReviewsForShipment(shipmentId)
  const submitReview = useSubmitReview()
  const [rating, setRating] = useState(0)

  const alreadyReviewed = reviews.some((r) => r?.reviewerRole === role)

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
        <CardTitle className="text-base">Avalie</CardTitle>
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
        <Button
          size="sm"
          disabled={rating === 0 || submitReview.isPending}
          onClick={() => submitReview.mutate({ shipmentId, rating })}
        >
          Enviar avaliação
        </Button>
      </CardContent>
    </Card>
  )
}
