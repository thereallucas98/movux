'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '~/components/ui/button'
import {
  DateTimeRangePicker,
  type DateTimeRange,
} from '~/components/ui/datetime-range-picker'
import { FileDropzone } from '~/components/ui/file-dropzone'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Type } from '~/components/ui/type'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

import { useSubmitRequest } from './_hooks/use-submit-request'

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

interface Props {
  workspaceId: string
  onSuccess: () => void
  onBack: () => void
}

const schema = z
  .object({
    timeOffStart: z.date({ message: 'Início obrigatório' }),
    timeOffEnd: z.date({ message: 'Fim obrigatório' }),
    reason: z
      .string()
      .trim()
      .min(1, 'Informe um motivo')
      .max(2000, 'Máximo 2000 caracteres'),
  })
  .refine((d) => d.timeOffStart < d.timeOffEnd, {
    message: 'Início deve ser antes do fim',
    path: ['timeOffEnd'],
  })
  .refine(
    (d) => d.timeOffEnd.getTime() - d.timeOffStart.getTime() <= NINETY_DAYS_MS,
    { message: 'Intervalo máximo de 90 dias', path: ['timeOffEnd'] },
  )

type Values = z.infer<typeof schema>

export function RequestTimeOffForm({ workspaceId, onSuccess, onBack }: Props) {
  const mutation = useSubmitRequest()
  const [attachment, setAttachment] = useState<File | null>(null)

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
      timeOffStart: undefined as unknown as Date,
      timeOffEnd: undefined as unknown as Date,
      reason: '',
    },
  })

  async function onSubmit(values: Values) {
    try {
      await mutation.mutateAsync({
        type: 'TIME_OFF',
        workspaceId,
        timeOffStart: values.timeOffStart.toISOString(),
        timeOffEnd: values.timeOffEnd.toISOString(),
        reason: values.reason,
        attachment,
      })
      onSuccess()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'ATTACHMENT_INVALID') {
        toast.error('Anexo inválido. Use PDF, PNG, JPEG ou WEBP até 5MB.')
        return
      }
      if (code === 'VALIDATION_ERROR') {
        setError('root', { message: 'Dados inválidos.' })
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
        <Label>Período</Label>
        <Controller
          control={control}
          name="timeOffStart"
          render={({ field: startField }) => (
            <Controller
              control={control}
              name="timeOffEnd"
              render={({ field: endField }) => (
                <DateTimeRangePicker
                  value={
                    {
                      start: startField.value as Date | undefined,
                      end: endField.value as Date | undefined,
                    } as DateTimeRange
                  }
                  onChange={(v) => {
                    startField.onChange(v.start ?? undefined)
                    endField.onChange(v.end ?? undefined)
                  }}
                  ariaInvalid={Boolean(
                    errors.timeOffStart || errors.timeOffEnd,
                  )}
                />
              )}
            />
          )}
        />
        {(errors.timeOffStart || errors.timeOffEnd) && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.timeOffEnd?.message ?? errors.timeOffStart?.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="time-off-reason">Motivo</Label>
        <Textarea
          id="time-off-reason"
          placeholder="Conte por que precisa da folga"
          {...register('reason')}
          aria-invalid={errors.reason ? true : undefined}
        />
        {errors.reason && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.reason.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Anexo (opcional)</Label>
        <FileDropzone
          value={attachment}
          onChange={setAttachment}
          accept="application/pdf,image/png,image/jpeg,image/webp"
          acceptLabel="PDF, PNG, JPEG ou WEBP"
          maxSizeBytes={5 * 1024 * 1024}
          disabled={isSubmitting}
        />
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
          {isSubmitting ? 'Enviando…' : 'Solicitar folga'}
        </Button>
      </div>
    </form>
  )
}
