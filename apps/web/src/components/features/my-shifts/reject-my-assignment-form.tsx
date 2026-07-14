'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { ApiError } from '~/lib/api-error'

import { useRejectMyAssignment } from './_hooks/use-reject-my-assignment'

interface Props {
  assignmentId: string
  onCancel: () => void
  onDone: () => void
}

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Informe um motivo')
    .max(500, 'Máximo 500 caracteres'),
})

type Values = z.infer<typeof schema>

export function RejectMyAssignmentForm({
  assignmentId,
  onCancel,
  onDone,
}: Props) {
  const mutation = useRejectMyAssignment()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { reason: '' },
  })

  async function onSubmit(values: Values) {
    try {
      await mutation.mutateAsync({
        assignmentId,
        reason: values.reason,
      })
      onDone()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'DECISION_WINDOW_EXPIRED') {
        toast.error('O prazo para responder expirou.')
        onDone()
        return
      }
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esta atribuição não pode mais ser respondida.')
        onDone()
        return
      }
      toast.error('Não foi possível rejeitar.')
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-border bg-muted/20 flex flex-col gap-3 rounded-[10px] border p-3"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={`reject-reason-${assignmentId}`}>Motivo</Label>
        <Textarea
          id={`reject-reason-${assignmentId}`}
          placeholder="Conte por que você não pode aceitar"
          {...register('reason')}
          aria-invalid={errors.reason ? true : undefined}
        />
        {errors.reason && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.reason.message}
          </span>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onCancel}
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
          {isSubmitting ? 'Enviando…' : 'Rejeitar'}
        </Button>
      </div>
    </form>
  )
}
