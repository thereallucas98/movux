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

import { useRejectCandidate } from './_hooks/use-reject-candidate'

interface Props {
  scheduleId: string
  shiftId: string
  candidateId: string
  userName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const schema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, 'Máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
})

type Values = z.infer<typeof schema>

export function RejectCandidateForm({
  scheduleId,
  shiftId,
  candidateId,
  userName,
  open,
  onOpenChange,
}: Props) {
  const mutation = useRejectCandidate(scheduleId, shiftId)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { reason: '' },
  })

  useEffect(() => {
    if (!open) reset({ reason: '' })
  }, [open, reset])

  async function onSubmit(values: Values) {
    try {
      await mutation.mutateAsync({
        candidateId,
        reason: values.reason?.length ? values.reason : undefined,
      })
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esta candidatura não pode mais ser rejeitada.')
        onOpenChange(false)
        return
      }
      toast.error('Não foi possível rejeitar.')
    }
  }

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Rejeitar candidatura de ${userName}`}
      description="Você pode adicionar um motivo opcional."
      breakpoint="mobile"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="reject-candidate-reason">Motivo (opcional)</Label>
          <Textarea
            id="reject-candidate-reason"
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
            disabled={isSubmitting}
            className="bg-destructive hover:opacity-90"
          >
            {isSubmitting ? 'Rejeitando…' : 'Rejeitar'}
          </Button>
        </div>
      </form>
    </AdaptiveDialog>
  )
}
