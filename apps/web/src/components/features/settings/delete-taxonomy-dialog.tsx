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

import type { TaxonomyAdapter } from './_adapters/types'
import { useDeleteTaxonomy } from './_hooks/use-delete-taxonomy'

interface Props {
  workspaceId: string
  adapter: TaxonomyAdapter
  row: { id: string; name: string }
  trigger: React.ReactNode
}

export function DeleteTaxonomyDialog({
  workspaceId,
  adapter,
  row,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false)
  const mutation = useDeleteTaxonomy(adapter.resource, workspaceId)

  async function handleConfirm() {
    try {
      await mutation.mutateAsync(row.id)
      setOpen(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      const msg = (code && adapter.errorMap[code]) ?? 'Falha ao remover.'
      toast.error(msg)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover {row.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {adapter.copy.deleteBody}
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
