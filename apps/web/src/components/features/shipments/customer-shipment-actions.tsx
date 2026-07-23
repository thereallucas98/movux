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
import { ProposalDetailDialog } from './proposal-detail-dialog'
import { ReviewTagPicker } from './review-tag-picker'
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
          Esse frete ainda está em rascunho — transportadores só veem depois de
          publicado.
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
  const { data: proposals = [], isLoading } =
    useProposalsForShipment(shipmentId)
  const accept = useAcceptProposal()
  const reject = useRejectProposal()
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null,
  )

  const selectedProposal =
    proposals.find((proposal) => proposal?.id === selectedProposalId) ?? null

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
            Nenhuma proposta ainda — transportadores da região já podem ver esse
            frete.
          </p>
        )}
        {proposals.map((proposal) =>
          proposal ? (
            <button
              key={proposal.id}
              type="button"
              disabled={
                proposal.status !== 'ACTIVE' ||
                proposal.currentAttemptResponseType !== 'PENDING'
              }
              onClick={() => setSelectedProposalId(proposal.id ?? null)}
              className="border-border hover:bg-muted focus-visible:ring-ring flex w-full items-center justify-between gap-3 rounded-[10px] border p-3 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="font-semibold">{proposal.carrierName}</p>
                <p className="text-muted-foreground">
                  {formatPriceInCents(proposal.priceInCents ?? 0)}
                </p>
              </div>
              {proposal.status === 'ACTIVE' &&
                proposal.currentAttemptResponseType === 'REJECTED' && (
                  <span className="text-muted-foreground text-xs">
                    Recusada — aguardando nova oferta
                  </span>
                )}
            </button>
          ) : null,
        )}
      </CardContent>

      <ProposalDetailDialog
        open={selectedProposalId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedProposalId(null)
        }}
        proposal={selectedProposal}
        isAccepting={accept.isPending}
        isRejecting={reject.isPending}
        onAccept={() => {
          if (!selectedProposal) return
          accept.mutate(
            { shipmentId, proposalId: selectedProposal.id ?? '' },
            { onSuccess: () => setSelectedProposalId(null) },
          )
        }}
        onReject={() => {
          if (!selectedProposal) return
          reject.mutate(
            { shipmentId, proposalId: selectedProposal.id ?? '' },
            { onSuccess: () => setSelectedProposalId(null) },
          )
        }}
      />
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
  const [reportingIssue, setReportingIssue] = useState(false)
  const [issueDescription, setIssueDescription] = useState('')

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
          O transportador marcou esse frete como entregue. Confirma que chegou
          tudo certo?
        </p>
        {reportingIssue ? (
          <div className="space-y-2">
            <textarea
              className="border-input min-h-24 w-full rounded-[10px] border bg-transparent p-3 text-sm"
              placeholder="Descreva o que aconteceu…"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={
                  confirmDelivery.isPending || issueDescription.trim() === ''
                }
                onClick={() =>
                  confirmDelivery.mutate({
                    shipmentId,
                    input: { confirmed: false, issueDescription },
                  })
                }
              >
                Enviar problema
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={confirmDelivery.isPending}
                onClick={() => setReportingIssue(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={confirmDelivery.isPending}
              onClick={() =>
                confirmDelivery.mutate({
                  shipmentId,
                  input: { confirmed: true },
                })
              }
            >
              Confirmar entrega
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={confirmDelivery.isPending}
              onClick={() => setReportingIssue(true)}
            >
              Reportar problema
            </Button>
          </div>
        )}
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
  const [tagIds, setTagIds] = useState<string[]>([])

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
        <ReviewTagPicker
          targetRole="CARRIER"
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
