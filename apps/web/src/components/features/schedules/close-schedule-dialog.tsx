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

import { useCloseSchedule } from './_hooks/use-close-schedule'

interface Props {
  workspaceId: string
  schedule: { id: string; name: string | null }
  trigger: React.ReactNode
}

function errorCopy(code: string | null): string {
  switch (code) {
    case 'INVALID_STATE_TRANSITION':
      return 'Operação não permitida no status atual.'
    case 'FORBIDDEN':
      return 'Sem permissão.'
    default:
      return 'Falha ao encerrar.'
  }
}

export function CloseScheduleDialog({ workspaceId, schedule, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const mutation = useCloseSchedule(workspaceId)

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
          <AlertDialogTitle>Encerrar essa escala?</AlertDialogTitle>
          <AlertDialogDescription>
            Você não poderá reabri-la. Use esta ação quando o período já tiver
            terminado e os turnos forem fechados.
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
            {mutation.isPending ? 'Encerrando…' : 'Encerrar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
