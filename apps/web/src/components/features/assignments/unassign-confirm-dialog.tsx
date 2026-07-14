'use client'

import { toast } from 'sonner'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { ApiError } from '~/lib/api-error'

import { useUnassignUser } from './_hooks/use-unassign-user'

interface Props {
  workspaceId: string
  scheduleId: string
  shiftId: string
  assignmentId: string
  userName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UnassignConfirmDialog({
  workspaceId,
  scheduleId,
  shiftId,
  assignmentId,
  userName,
  open,
  onOpenChange,
}: Props) {
  const mutation = useUnassignUser(workspaceId, scheduleId, shiftId)

  async function handleConfirm() {
    try {
      await mutation.mutateAsync(assignmentId)
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esta atribuição não pode mais ser cancelada.')
      } else {
        toast.error('Não foi possível cancelar.')
      }
    }
  }

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancelar atribuição"
      description={`${userName} não fará mais parte deste turno.`}
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
            className="bg-destructive hover:opacity-90"
          >
            {mutation.isPending ? 'Cancelando…' : 'Cancelar atribuição'}
          </Button>
        </div>
      }
    >
      <p className="text-muted-foreground text-[14px]">
        Esta ação só é permitida em atribuições pendentes ou expiradas.
      </p>
    </AdaptiveDialog>
  )
}
