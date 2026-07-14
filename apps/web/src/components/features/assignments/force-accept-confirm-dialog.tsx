'use client'

import { toast } from 'sonner'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { ApiError } from '~/lib/api-error'

import { useForceAccept } from './_hooks/use-force-accept'

interface Props {
  scheduleId: string
  shiftId: string
  assignmentId: string
  userName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForceAcceptConfirmDialog({
  scheduleId,
  shiftId,
  assignmentId,
  userName,
  open,
  onOpenChange,
}: Props) {
  const mutation = useForceAccept(scheduleId, shiftId)

  async function handleConfirm() {
    try {
      await mutation.mutateAsync(assignmentId)
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esta atribuição não pode mais ser forçada.')
      } else {
        toast.error('Não foi possível forçar o aceite.')
      }
    }
  }

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Forçar aceite"
      description={`Vamos marcar ${userName} como ACEITO mesmo sem resposta.`}
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
            {mutation.isPending ? 'Forçando…' : 'Forçar aceite'}
          </Button>
        </div>
      }
    >
      <p className="text-muted-foreground text-[14px]">
        Esta ação ignora a janela de decisão e fica registrada no audit log.
      </p>
    </AdaptiveDialog>
  )
}
