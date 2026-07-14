'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { ApiError } from '~/lib/api-error'

import { usePublishSchedule } from './_hooks/use-publish-schedule'

interface Props {
  workspaceId: string
  schedule: { id: string; name: string | null }
  trigger: React.ReactNode
}

function errorCopy(code: string | null): string {
  switch (code) {
    case 'INVALID_STATE_TRANSITION':
      return 'Operação não permitida no status atual.'
    case 'SCHEDULE_PERIOD_OVERLAP':
      return 'Já existe uma escala publicada que cobre esse período.'
    case 'FORBIDDEN':
      return 'Sem permissão.'
    default:
      return 'Falha ao publicar.'
  }
}

export function PublishScheduleDialog({
  workspaceId,
  schedule,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false)
  const mutation = usePublishSchedule(workspaceId)

  async function handleConfirm() {
    try {
      await mutation.mutateAsync(schedule.id)
      setOpen(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      toast.error(errorCopy(code))
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publicar essa escala?</AlertDialogTitle>
          <AlertDialogDescription>
            A partir daí ela ficará visível para a equipe. Após publicada, datas
            e categoria não poderão mais ser editadas (somente o nome).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Publicando…' : 'Publicar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
