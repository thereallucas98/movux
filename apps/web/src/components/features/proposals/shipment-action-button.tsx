'use client'

import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { useAddProposalAttempt } from '~/graphql/hooks/use-add-proposal-attempt'
import { useJoinQueue } from '~/graphql/hooks/use-join-queue'
import { useMyProposal } from '~/graphql/hooks/use-my-proposal'
import { useQueueEntry } from '~/graphql/hooks/use-queue-entry'
import { useSubmitProposal } from '~/graphql/hooks/use-submit-proposal'
import { useWithdrawProposal } from '~/graphql/hooks/use-withdraw-proposal'
import { useWithdrawQueue } from '~/graphql/hooks/use-withdraw-queue'
import {
  ProposalFormDialog,
  type ProposalFormValues,
} from './proposal-form-dialog'
import { resolveCardAction } from './resolve-card-action'
import { WithdrawConfirmDialog } from './withdraw-confirm-dialog'

/**
 * Botão de ação de um frete pro carrier — resolve fila + proposta (2 queries)
 * e decide o que mostrar via `resolveCardAction`. Reaproveitado tanto no
 * card de browse (`/carrier/shipments`) quanto na lista de propostas
 * (`/carrier/proposals`) — a lógica de "qual ação, qual dialog" mora só aqui.
 */
export function ShipmentActionButton({ shipmentId }: { shipmentId: string }) {
  const { data: queueEntry } = useQueueEntry(shipmentId)
  const { data: proposal } = useMyProposal(shipmentId)

  const joinQueue = useJoinQueue()
  const withdrawQueue = useWithdrawQueue()
  const submitProposal = useSubmitProposal()
  const addProposalAttempt = useAddProposalAttempt()
  const withdrawProposal = useWithdrawProposal()

  const [proposalDialogOpen, setProposalDialogOpen] = useState(false)
  const [withdrawQueueDialogOpen, setWithdrawQueueDialogOpen] = useState(false)
  const [withdrawProposalDialogOpen, setWithdrawProposalDialogOpen] =
    useState(false)

  const resolved = resolveCardAction({
    queueStatus: queueEntry?.status ?? null,
    proposalStatus: proposal?.status ?? null,
    currentAttempt: proposal?.currentAttempt ?? null,
  })

  const dialogMode: 'submit' | 'counter-offer' = resolved.actions.includes(
    'submit-proposal',
  )
    ? 'submit'
    : 'counter-offer'

  function handleProposalFormSubmit(values: ProposalFormValues) {
    if (dialogMode === 'submit') {
      submitProposal.mutate(
        {
          shipmentId,
          input: {
            priceInCents: values.priceInCents,
            carrierSlaHours: values.carrierSlaHours ?? 24,
            message: values.message || undefined,
          },
        },
        { onSuccess: () => setProposalDialogOpen(false) },
      )
      return
    }
    addProposalAttempt.mutate(
      {
        shipmentId,
        input: {
          priceInCents: values.priceInCents,
          message: values.message || undefined,
        },
      },
      { onSuccess: () => setProposalDialogOpen(false) },
    )
  }

  if (resolved.readOnlyLabel) {
    return (
      <span className="text-muted-foreground text-sm">
        {resolved.readOnlyLabel}
      </span>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {resolved.actions.includes('join') && (
          <Button
            type="button"
            size="sm"
            onClick={() => joinQueue.mutate(shipmentId)}
            disabled={joinQueue.isPending}
          >
            Entrar na fila
          </Button>
        )}
        {resolved.actions.includes('submit-proposal') && (
          <Button
            type="button"
            size="sm"
            onClick={() => setProposalDialogOpen(true)}
          >
            Enviar proposta
          </Button>
        )}
        {resolved.actions.includes('counter-offer') && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setProposalDialogOpen(true)}
          >
            Nova proposta
          </Button>
        )}
        {resolved.actions.includes('withdraw-queue') && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setWithdrawQueueDialogOpen(true)}
          >
            Sair da fila
          </Button>
        )}
        {resolved.actions.includes('withdraw-proposal') && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setWithdrawProposalDialogOpen(true)}
          >
            Desistir
          </Button>
        )}
      </div>

      <ProposalFormDialog
        open={proposalDialogOpen}
        onOpenChange={setProposalDialogOpen}
        mode={dialogMode}
        onSubmit={handleProposalFormSubmit}
        isPending={submitProposal.isPending || addProposalAttempt.isPending}
      />

      <WithdrawConfirmDialog
        open={withdrawQueueDialogOpen}
        onOpenChange={setWithdrawQueueDialogOpen}
        title="Sair da fila"
        description="Você vai perder sua posição na fila desse frete. Pra participar de novo, precisa entrar na fila do zero — se o frete ainda estiver aberto."
        onConfirm={() =>
          withdrawQueue.mutate(shipmentId, {
            onSuccess: () => setWithdrawQueueDialogOpen(false),
          })
        }
        isPending={withdrawQueue.isPending}
      />

      <WithdrawConfirmDialog
        open={withdrawProposalDialogOpen}
        onOpenChange={setWithdrawProposalDialogOpen}
        title="Desistir da proposta"
        description="Sua proposta será retirada e você perde a vaga na fila desse frete. Essa ação não pode ser desfeita."
        onConfirm={() =>
          withdrawProposal.mutate(shipmentId, {
            onSuccess: () => setWithdrawProposalDialogOpen(false),
          })
        }
        isPending={withdrawProposal.isPending}
      />
    </>
  )
}
