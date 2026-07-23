'use client'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'

interface DeactivateVehicleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending?: boolean
}

export function DeactivateVehicleDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: DeactivateVehicleDialogProps) {
  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Desativar veículo?"
      description="O veículo sai de circulação pra matches e propostas novas. Essa ação não pode ser desfeita — você pode cadastrar outro veículo depois."
      footer={
        <div className="flex flex-row-reverse gap-2">
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Desativando...' : 'Desativar'}
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
