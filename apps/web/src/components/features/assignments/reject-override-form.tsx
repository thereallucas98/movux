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

import { useAdminReject } from './_hooks/use-admin-reject'

interface Props {
  scheduleId: string
  shiftId: string
  assignmentId: string
  userName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Informe um motivo')
    .max(500, 'Máximo 500 caracteres'),
})

type RejectValues = z.infer<typeof rejectSchema>

export function RejectOverrideForm({
  scheduleId,
  shiftId,
  assignmentId,
  userName,
  open,
  onOpenChange,
}: Props) {
  const mutation = useAdminReject(scheduleId, shiftId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RejectValues>({
    resolver: zodResolver(rejectSchema),
    mode: 'onChange',
    defaultValues: { reason: '' },
  })

  useEffect(() => {
    if (!open) reset({ reason: '' })
  }, [open, reset])

  async function onSubmit(values: RejectValues) {
    try {
      await mutation.mutateAsync({ assignmentId, reason: values.reason })
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esta atribuição não pode mais ser rejeitada.')
      } else {
        toast.error('Não foi possível rejeitar.')
      }
    }
  }

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Rejeitar em nome de ${userName}`}
      description="O motivo será registrado no audit log."
      breakpoint="mobile"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="admin-reject-reason">Motivo</Label>
          <Textarea
            id="admin-reject-reason"
            {...register('reason')}
            aria-invalid={errors.reason ? true : undefined}
          />
          {errors.reason && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.reason.message}
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
            Voltar
          </Button>
          <Button
            type="submit"
            variant="solid"
            size="md"
            disabled={!isValid || isSubmitting}
            className="bg-destructive hover:opacity-90"
          >
            {isSubmitting ? 'Rejeitando…' : 'Rejeitar'}
          </Button>
        </div>
      </form>
    </AdaptiveDialog>
  )
}
