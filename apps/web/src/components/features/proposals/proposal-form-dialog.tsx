'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { CurrencyInput } from '~/components/ui/masked-input'
import { Textarea } from '~/components/ui/textarea'
import {
  AddProposalAttemptSchema,
  SubmitProposalSchema,
} from '~/server/schemas/proposal.schema'
import { CUSTOMER_SLA_HOURS_OPTIONS } from '../shipments/shipment-labels'

const SLA_OPTIONS = CUSTOMER_SLA_HOURS_OPTIONS.map((hours) => ({
  value: String(hours),
  label: `${hours}h`,
}))

export interface ProposalFormValues {
  priceInCents: number
  carrierSlaHours?: 4 | 6 | 8 | 12 | 24
  message?: string
}

const DEFAULT_VALUES: ProposalFormValues = {
  priceInCents: 0,
  carrierSlaHours: undefined,
  message: '',
}

interface ProposalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `submit` pede prazo de resposta do carrier; `counter-offer` só preço/mensagem */
  mode: 'submit' | 'counter-offer'
  onSubmit: (values: ProposalFormValues) => void
  isPending?: boolean
}

/**
 * Mesmo dialog atende envio inicial (`submitProposal`) e contra-oferta
 * (`addProposalAttempt`) — o schema Zod trocado por `mode` é o que decide
 * se `carrierSlaHours` é exigido (só faz sentido na 1ª proposta; depois o
 * SLA acordado não muda mais).
 */
export function ProposalFormDialog({
  open,
  onOpenChange,
  mode,
  onSubmit,
  isPending = false,
}: ProposalFormDialogProps) {
  const schema =
    mode === 'submit' ? SubmitProposalSchema : AddProposalAttemptSchema

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  })

  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES)
      form.trigger()
    }
    // eslint-disable-next-line
  }, [open, mode])

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        mode === 'submit' ? 'Enviar proposta' : 'Nova proposta (contra-oferta)'
      }
      footer={
        <div className="flex flex-row-reverse gap-2">
          <Button
            type="submit"
            form="proposal-form"
            disabled={isPending || !form.formState.isValid}
          >
            {isPending ? 'Enviando...' : 'Enviar'}
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
          id="proposal-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="priceInCents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor da proposta</FormLabel>
                <FormControl>
                  <CurrencyInput
                    className="min-h-12"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === 'submit' && (
            <FormField
              control={form.control}
              name="carrierSlaHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu prazo de resposta</FormLabel>
                  <FormControl>
                    <AdaptiveSelect
                      options={SLA_OPTIONS}
                      getOptionValue={(o) => o.value}
                      getOptionLabel={(o) => o.label}
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(v) => field.onChange(Number(v))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mensagem (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Alguma observação pro cliente?"
                    {...field}
                  />
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
