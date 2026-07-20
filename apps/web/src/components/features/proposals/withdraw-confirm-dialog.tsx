'use client'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'

interface WithdrawConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  isPending?: boolean
}

/**
 * Confirmação reaproveitada tanto pra "sair da fila" quanto pra "desistir
 * da proposta" — ambas ações destrutivas (sem volta: reentrar exige juntar
 * na fila do zero, se o frete ainda estiver aberto).
 */
export function WithdrawConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isPending = false,
}: WithdrawConfirmDialogProps) {
  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <div className="flex flex-row-reverse gap-2">
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Confirmando...' : 'Confirmar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
        </div>
      }
    >
      <div />
    </AdaptiveDialog>
  )
}
