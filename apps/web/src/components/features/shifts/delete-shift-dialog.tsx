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

import { useDeleteShift } from './_hooks/use-delete-shift'

interface Props {
  workspaceId: string
  scheduleId: string
  shiftId: string
  trigger: React.ReactNode
}

function errorCopy(code: string | null): string {
  switch (code) {
    case 'INVALID_STATE_TRANSITION':
      return 'Apenas turnos de escalas em rascunho podem ser removidos.'
    case 'FORBIDDEN':
      return 'Sem permissão.'
    default:
      return 'Falha ao remover.'
  }
}

export function DeleteShiftDialog({
  workspaceId,
  scheduleId,
  shiftId,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false)
  const mutation = useDeleteShift(workspaceId, scheduleId)

  async function handleConfirm() {
    try {
      await mutation.mutateAsync(shiftId)
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
          <AlertDialogTitle>Remover turno?</AlertDialogTitle>
          <AlertDialogDescription>
            Disponível apenas em escalas em rascunho. O turno poderá ser
            recriado depois.
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
            {mutation.isPending ? 'Removendo…' : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
