'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { useMyAssignments } from '~/components/features/my-shifts/_hooks/use-my-assignments'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { Type } from '~/components/ui/type'
import { ApiError } from '~/lib/api-error'
import { formatShiftStartLabel } from '~/lib/format/date'
import { cn } from '~/lib/utils'

import { useSubmitRequest } from './_hooks/use-submit-request'

interface Props {
  workspaceId: string
  workspaceTimezone: string
  onSuccess: () => void
  onBack: () => void
}

const schema = z.object({
  offerSourceAssignmentId: z.uuid('Selecione seu turno'),
  reason: z
    .string()
    .trim()
    .min(1, 'Informe um motivo')
    .max(2000, 'Máximo 2000 caracteres'),
})

type Values = z.infer<typeof schema>

export function RequestOfferForm({
  workspaceId,
  workspaceTimezone,
  onSuccess,
  onBack,
}: Props) {
  const myAssignmentsQuery = useMyAssignments(['ACCEPTED'])
  const mutation = useSubmitRequest()

  const myAssignments = useMemo(() => {
    return (myAssignmentsQuery.data ?? []).filter(
      (a) => a.shift.schedule.workspaceId === workspaceId,
    )
  }, [myAssignmentsQuery.data, workspaceId])

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      offerSourceAssignmentId: '',
      reason: '',
    },
  })

  async function onSubmit(values: Values) {
    try {
      await mutation.mutateAsync({
        type: 'OFFER',
        workspaceId,
        offerSourceAssignmentId: values.offerSourceAssignmentId,
        reason: values.reason,
      })
      onSuccess()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esse turno não está mais elegível.')
        return
      }
      setError('root', { message: 'Não foi possível criar o pedido.' })
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label>Seu turno</Label>
        <Controller
          control={control}
          name="offerSourceAssignmentId"
          render={({ field }) => (
            <Select
              value={field.value || ''}
              onValueChange={field.onChange}
              disabled={myAssignmentsQuery.isLoading}
            >
              <SelectTrigger
                className="h-12"
                aria-invalid={errors.offerSourceAssignmentId ? true : undefined}
              >
                <SelectValue placeholder="Selecione seu turno" />
              </SelectTrigger>
              <SelectContent>
                {myAssignments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {formatShiftStartLabel(
                      new Date(a.shift.startAt),
                      workspaceTimezone,
                    )}
                    {' – '}
                    {formatShiftStartLabel(
                      new Date(a.shift.endAt),
                      workspaceTimezone,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.offerSourceAssignmentId && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.offerSourceAssignmentId.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="offer-reason">Motivo</Label>
        <Textarea
          id="offer-reason"
          placeholder="Por que está oferecendo este turno?"
          {...register('reason')}
          aria-invalid={errors.reason ? true : undefined}
        />
        {errors.reason && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.reason.message}
          </span>
        )}
      </div>

      {errors.root && <Type variant="danger">{errors.root.message}</Type>}

      <div className="flex justify-between gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          variant="solid"
          size="md"
          disabled={!isValid || isSubmitting}
          className={cn(isSubmitting && 'opacity-60')}
        >
          {isSubmitting ? 'Enviando…' : 'Oferecer turno'}
        </Button>
      </div>
    </form>
  )
}
