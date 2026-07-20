'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { AdaptiveSelect } from '~/components/ui/adaptive-select'
import { Button } from '~/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form'
import { Textarea } from '~/components/ui/textarea'
import { ExternalValidationBodySchema } from '~/server/schemas/carrier-document.schema'

// z.input (não z.infer) — o form nasce com `result` vazio (nada selecionado)
// até o usuário escolher; o Zod exige um dos 3 valores só na submissão.
type ExternalValidationFormValues = z.input<typeof ExternalValidationBodySchema>

const RESULT_OPTIONS: {
  value: ExternalValidationFormValues['result']
  label: string
}[] = [
  { value: 'MATCH', label: 'Confere' },
  { value: 'MISMATCH', label: 'Não confere' },
  { value: 'INCONCLUSIVE', label: 'Inconclusivo' },
]

const DEFAULT_VALUES: ExternalValidationFormValues = {
  result: undefined as unknown as ExternalValidationFormValues['result'],
  notes: '',
}

interface ExternalValidationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: {
    result: 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE'
    notes?: string
  }) => void
  isPending?: boolean
}

export function ExternalValidationDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: ExternalValidationDialogProps) {
  const form = useForm<ExternalValidationFormValues>({
    resolver: zodResolver(ExternalValidationBodySchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  })

  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES)
      form.trigger()
    }
    // eslint-disable-next-line
  }, [open])

  function handleSubmit(values: ExternalValidationFormValues) {
    if (!values.result) return
    onSubmit({ result: values.result, notes: values.notes || undefined })
  }

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar checagem externa"
      description="Conferência manual de CPF/CNH — registre o resultado da consulta feita fora do sistema."
      footer={
        <div className="flex flex-row-reverse gap-2">
          <Button
            type="submit"
            form="external-validation-form"
            disabled={isPending || !form.formState.isValid}
          >
            {isPending ? 'Registrando...' : 'Registrar'}
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
      <Form {...form}>
        <form
          id="external-validation-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="result"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resultado</FormLabel>
                <FormControl>
                  <AdaptiveSelect
                    options={RESULT_OPTIONS}
                    getOptionValue={(o) => o.value}
                    getOptionLabel={(o) => o.label}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observação (opcional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Alguma observação?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AdaptiveDialog>
  )
}
