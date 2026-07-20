'use client'

import type { UseFormReturn } from 'react-hook-form'
import { AdaptiveSelect } from '~/components/ui/adaptive-select'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form'
import type { NeighborhoodOption } from '~/graphql/hooks/use-neighborhoods'
import type { CreateShipmentFormValues } from './create-shipment-form'

interface NeighborhoodSelectFieldProps {
  form: UseFormReturn<CreateShipmentFormValues>
  prefix: 'origin' | 'destination'
  label: string
  neighborhoods: NeighborhoodOption[]
  isLoading: boolean
}

export function NeighborhoodSelectField({
  form,
  prefix,
  label,
  neighborhoods,
  isLoading,
}: NeighborhoodSelectFieldProps) {
  return (
    <FormField
      control={form.control}
      name={`${prefix}.neighborhoodId`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <AdaptiveSelect
              options={neighborhoods}
              getOptionValue={(neighborhood) => neighborhood.id}
              getOptionLabel={(neighborhood) =>
                `${neighborhood.name} — ${neighborhood.cityName}/${neighborhood.stateUf}`
              }
              value={field.value || undefined}
              onValueChange={(neighborhoodId) => {
                field.onChange(neighborhoodId)
                const selected = neighborhoods.find(
                  (n) => n.id === neighborhoodId,
                )
                if (selected) {
                  form.setValue(`${prefix}.cityId`, selected.cityId, {
                    shouldValidate: true,
                  })
                  form.setValue(`${prefix}.state`, selected.stateUf, {
                    shouldValidate: true,
                  })
                }
              }}
              placeholder={
                isLoading ? 'Carregando bairros…' : 'Selecione o bairro'
              }
              disabled={isLoading}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
