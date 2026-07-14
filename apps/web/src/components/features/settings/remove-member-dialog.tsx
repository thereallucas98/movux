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

import { useRemoveMember } from './_hooks/use-remove-member'

interface Props {
  workspaceId: string
  memberId: string
  fullName: string
  trigger: React.ReactNode
}

function errorCopy(code: string | null): string {
  switch (code) {
    case 'LAST_ADMIN':
      return 'Não é possível remover o último ADMIN.'
    case 'CANNOT_DEMOTE_SELF':
      return 'Você não pode remover sua própria conta.'
    default:
      return 'Falha ao remover membro.'
  }
}

export function RemoveMemberDialog({
  workspaceId,
  memberId,
  fullName,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false)
  const mutation = useRemoveMember(workspaceId)

  async function handleConfirm() {
    try {
      await mutation.mutateAsync(memberId)
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
          <AlertDialogTitle>Remover {fullName}?</AlertDialogTitle>
          <AlertDialogDescription>
            A pessoa perderá acesso a este workspace. Você pode adicioná-la
            novamente depois.
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
