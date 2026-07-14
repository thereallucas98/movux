'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { Textarea } from '~/components/ui/textarea'
import { ApiError } from '~/lib/api-error'

import type { RequestWithRelationsRow } from './_hooks/use-requests'
import { useResolveRequest } from './_hooks/use-resolve-request'

interface Props {
  workspaceId: string
  request: RequestWithRelationsRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

const schema = z
  .object({
    decision: z.enum(['APPROVE', 'REJECT']),
    resolutionReason: z
      .string()
      .trim()
      .max(2000, 'Máximo 2000 caracteres')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (d) => d.decision !== 'REJECT' || (d.resolutionReason ?? '').length > 0,
    {
      message: 'Informe um motivo para rejeitar',
      path: ['resolutionReason'],
    },
  )

type Values = z.infer<typeof schema>

export function ResolveRequestDialog({
  workspaceId,
  request,
  open,
  onOpenChange,
}: Props) {
  const mutation = useResolveRequest(workspaceId)

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { decision: 'APPROVE', resolutionReason: '' },
  })

  useEffect(() => {
    if (!open) reset({ decision: 'APPROVE', resolutionReason: '' })
  }, [open, reset])

  const decision = watch('decision')

  async function onSubmit(values: Values) {
    try {
      await mutation.mutateAsync({
        requestId: request.id,
        decision: values.decision,
        resolutionReason: values.resolutionReason?.length
          ? values.resolutionReason
          : undefined,
      })
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esse pedido não pode mais ser resolvido.')
        onOpenChange(false)
        return
      }
      toast.error('Não foi possível resolver o pedido.')
    }
  }

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resolver pedido"
      description="Aprovar ou rejeitar com justificativa."
      breakpoint="mobile"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-semibold">Decisão</span>
          <Controller
            control={control}
            name="decision"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="APPROVE" id="resolve-approve" />
                  <Label htmlFor="resolve-approve" className="font-normal">
                    Aprovar
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="REJECT" id="resolve-reject" />
                  <Label htmlFor="resolve-reject" className="font-normal">
                    Rejeitar
                  </Label>
                </div>
              </RadioGroup>
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="resolve-reason">
            {decision === 'REJECT'
              ? 'Motivo (obrigatório)'
              : 'Motivo (opcional)'}
          </Label>
          <Textarea
            id="resolve-reason"
            {...register('resolutionReason')}
            aria-invalid={errors.resolutionReason ? true : undefined}
          />
          {errors.resolutionReason && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.resolutionReason.message}
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
          >
            {isSubmitting
              ? 'Enviando…'
              : decision === 'APPROVE'
                ? 'Aprovar'
                : 'Rejeitar'}
          </Button>
        </div>
      </form>
    </AdaptiveDialog>
  )
}
