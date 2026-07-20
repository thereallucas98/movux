'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
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
import { RejectCarrierDocumentSchema } from '~/server/schemas/carrier-document.schema'

interface RejectDocumentFormValues {
  rejectionReason: string
}

const DEFAULT_VALUES: RejectDocumentFormValues = { rejectionReason: '' }

interface RejectDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (rejectionReason: string) => void
  isPending?: boolean
}

export function RejectDocumentDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: RejectDocumentDialogProps) {
  const form = useForm<RejectDocumentFormValues>({
    resolver: zodResolver(RejectCarrierDocumentSchema),
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

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rejeitar documento"
      footer={
        <div className="flex flex-row-reverse gap-2">
          <Button
            type="submit"
            form="reject-document-form"
            variant="destructive"
            disabled={isPending || !form.formState.isValid}
          >
            {isPending ? 'Rejeitando...' : 'Rejeitar'}
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
          id="reject-document-form"
          onSubmit={form.handleSubmit((values) =>
            onSubmit(values.rejectionReason),
          )}
        >
          <FormField
            control={form.control}
            name="rejectionReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo da rejeição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Explique o que precisa ser corrigido"
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
