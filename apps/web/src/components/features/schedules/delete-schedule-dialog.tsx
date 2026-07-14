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

import { useDeleteSchedule } from './_hooks/use-delete-schedule'

interface Props {
  workspaceId: string
  schedule: { id: string; name: string | null }
  trigger: React.ReactNode
}

function errorCopy(code: string | null): string {
  switch (code) {
    case 'INVALID_STATE_TRANSITION':
      return 'Apenas escalas em rascunho podem ser apagadas.'
    case 'FORBIDDEN':
      return 'Sem permissão.'
    default:
      return 'Falha ao apagar.'
  }
}

export function DeleteScheduleDialog({
  workspaceId,
  schedule,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false)
  const mutation = useDeleteSchedule(workspaceId)

  async function handleConfirm() {
    try {
      await mutation.mutateAsync(schedule.id)
      setOpen(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      toast.error(errorCopy(code))
    }
  }

  const display = schedule.name ?? 'essa escala'

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar {display}?</AlertDialogTitle>
          <AlertDialogDescription>
            Disponível apenas para escalas em rascunho. A escala poderá ser
            recriada depois.
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
            className="bg-destructive text-destructive-foreground hover:opacity-90"
          >
            {mutation.isPending ? 'Apagando…' : 'Apagar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
