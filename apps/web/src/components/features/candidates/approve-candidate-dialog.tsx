'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import { ApiError } from '~/lib/api-error'

import { useApproveCandidate } from './_hooks/use-approve-candidate'

interface Props {
  scheduleId: string
  shiftId: string
  candidateId: string
  userName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApproveCandidateDialog({
  scheduleId,
  shiftId,
  candidateId,
  userName,
  open,
  onOpenChange,
}: Props) {
  const [autoAccept, setAutoAccept] = useState(false)
  const mutation = useApproveCandidate(scheduleId, shiftId)

  async function handleConfirm() {
    try {
      await mutation.mutateAsync({ candidateId, autoAccept })
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'SHIFT_HEADCOUNT_FULL') {
        toast.error('Não há mais vagas disponíveis.')
        onOpenChange(false)
        return
      }
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esta candidatura não pode mais ser aprovada.')
        onOpenChange(false)
        return
      }
      toast.error('Não foi possível aprovar.')
    }
  }

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Aprovar candidatura"
      description={`${userName} entrará no turno como atribuído.`}
      breakpoint="mobile"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant="solid"
            size="md"
            onClick={handleConfirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Aprovando…' : 'Aprovar'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <Label htmlFor="auto-accept">Auto-aceitar</Label>
            <span className="text-muted-foreground text-[12px]">
              Marca a atribuição como ACEITA imediatamente, ignorando a janela
              de decisão.
            </span>
          </div>
          <Switch
            id="auto-accept"
            checked={autoAccept}
            onCheckedChange={setAutoAccept}
            disabled={mutation.isPending}
          />
        </div>
        <p className="text-muted-foreground text-[13px]">
          Sem auto-aceitar, o usuário ainda precisa aceitar a atribuição na aba
          "Pendentes" dentro da janela de decisão.
        </p>
      </div>
    </AdaptiveDialog>
  )
}
