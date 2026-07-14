'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Type } from '~/components/ui/type'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

import { useAddShiftTimelineNote } from './_hooks/use-add-shift-timeline-note'

interface Props {
  shiftId: string
}

const schema = z.object({
  note: z
    .string()
    .trim()
    .min(1, 'Informe uma nota')
    .max(2000, 'Máximo 2000 caracteres'),
})

type Values = z.infer<typeof schema>

export function AddNoteForm({ shiftId }: Props) {
  const mutation = useAddShiftTimelineNote(shiftId)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { note: '' },
  })

  const note = watch('note') ?? ''
  const count = [...note].length

  async function onSubmit(values: Values) {
    try {
      await mutation.mutateAsync(values.note)
      reset({ note: '' })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'FORBIDDEN' || code === 'NOT_FOUND') {
        toast.error('Você não pode adicionar notas neste turno.')
        return
      }
      setError('root', { message: 'Não foi possível adicionar a nota.' })
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        'border-border bg-background flex flex-col gap-3 border-t p-3',
        'fixed inset-x-0 bottom-0 z-10',
        'lg:static lg:rounded-[10px] lg:border lg:p-4',
      )}
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="add-note">Adicionar nota</Label>
        <Textarea
          id="add-note"
          rows={2}
          placeholder="Registre uma comunicação ou observação"
          {...register('note')}
          aria-invalid={errors.note ? true : undefined}
        />
        <div className="flex items-center justify-between">
          {errors.note ? (
            <span className="text-destructive text-[13px] font-medium">
              {errors.note.message}
            </span>
          ) : (
            <span />
          )}
          <span
            className={cn(
              'text-muted-foreground text-[12px]',
              count > 2000 && 'text-destructive',
            )}
          >
            {count}/2000
          </span>
        </div>
      </div>
      {errors.root && <Type variant="danger">{errors.root.message}</Type>}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="solid"
          size="md"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? 'Enviando…' : 'Adicionar nota'}
        </Button>
      </div>
    </form>
  )
}
