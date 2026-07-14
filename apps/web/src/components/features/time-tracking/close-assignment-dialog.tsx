'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { ApiError } from '~/lib/api-error'

import { useCloseAssignment } from './_hooks/use-close-assignment'

interface Props {
  workspaceId: string
  assignmentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const schema = z.object({
  notes: z
    .string()
    .trim()
    .max(2000, 'Máximo 2000 caracteres')
    .optional()
    .or(z.literal('')),
})

type Values = z.infer<typeof schema>

export function CloseAssignmentDialog({
  workspaceId,
  assignmentId,
  open,
  onOpenChange,
}: Props) {
  const mutation = useCloseAssignment(workspaceId)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { notes: '' },
  })

  useEffect(() => {
    if (!open) reset({ notes: '' })
  }, [open, reset])

  async function onSubmit(values: Values) {
    try {
      await mutation.mutateAsync({
        assignmentId,
        notes: values.notes?.length ? values.notes : undefined,
      })
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Este assignment não pode mais ser fechado.')
        onOpenChange(false)
        return
      }
      toast.error('Não foi possível fechar.')
    }
  }

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Fechar assignment"
      description="Adicione notas opcionais para o registro de auditoria."
      breakpoint="mobile"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="close-notes">Notas (opcional)</Label>
          <Textarea
            id="close-notes"
            placeholder="Observações sobre este turno"
            {...register('notes')}
            aria-invalid={errors.notes ? true : undefined}
          />
          {errors.notes && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.notes.message}
            </span>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="solid"
            size="md"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Fechando…' : 'Fechar'}
          </Button>
        </div>
      </form>
    </AdaptiveDialog>
  )
}
