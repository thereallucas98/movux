'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'
import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import type { ProposalsForShipmentQuery } from '~/graphql/generated/types'
import { formatPriceInCents } from '~/lib/format-price'

type ProposalItem = NonNullable<
  ProposalsForShipmentQuery['proposalsForShipment']
>[number]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposal: ProposalItem | null
  onAccept: () => void
  onReject: () => void
  isAccepting: boolean
  isRejecting: boolean
}

// Achado #8 da QA momento-zero: cliente decidia só com nome + preço, sem
// telefone nem nota do transportador. Abre no clique do card, antes de
// aceitar/recusar.
export function ProposalDetailDialog({
  open,
  onOpenChange,
  proposal,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: Props) {
  const [showPhone, setShowPhone] = useState(false)

  if (!proposal) return null

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setShowPhone(false)
        onOpenChange(next)
      }}
      title={proposal.carrierName}
      footer={
        <div className="flex flex-row-reverse gap-2">
          <Button disabled={isAccepting || isRejecting} onClick={onAccept}>
            {isAccepting ? 'Aceitando...' : 'Aceitar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isAccepting || isRejecting}
            onClick={onReject}
          >
            {isRejecting ? 'Recusando...' : 'Recusar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Valor da proposta</span>
          <span className="font-semibold">
            {formatPriceInCents(proposal.priceInCents ?? 0)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Avaliação</span>
          <span className="flex items-center gap-1 font-semibold">
            <Star className="fill-primary text-primary size-4" />
            {proposal.carrierAvgRating?.toFixed(1) ?? 'Sem avaliações ainda'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Telefone</span>
          {showPhone ? (
            <span className="font-semibold">
              {proposal.carrierPhone ?? 'Não informado'}
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowPhone(true)}
            >
              Mostrar telefone
            </Button>
          )}
        </div>
      </div>
    </AdaptiveDialog>
  )
}
