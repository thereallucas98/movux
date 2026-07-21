'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { AdaptiveDatePicker } from '~/components/ui/adaptive-date-picker'
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
import { Input } from '~/components/ui/input'
import { CepInput } from '~/components/ui/masked-input'
import { Textarea } from '~/components/ui/textarea'
import { isMorningWindowBlocked } from '~/lib/date-br'
import { useCreateShipment } from '~/graphql/hooks/use-create-shipment'
import {
  useNeighborhoods,
  type NeighborhoodOption,
} from '~/graphql/hooks/use-neighborhoods'
import { CreateShipmentSchema } from '~/server/schemas/shipment.schema'
import { lookupCep, normalizeCep, normalizeCityName } from '~/lib/via-cep'
import { NeighborhoodSelectField } from './neighborhood-select-field'
import {
  CUSTOMER_SLA_HOURS_OPTIONS,
  SHIPMENT_TYPE_LABELS,
  TIME_WINDOW_LABELS,
  VEHICLE_TYPE_LABELS,
} from './shipment-labels'

// z.input (não z.infer/z.output) — o form manipula o formato ANTES do
// Zod aplicar `.default([])` em modifiers; zodResolver espera o input shape.
export type CreateShipmentFormValues = z.input<typeof CreateShipmentSchema>

const EMPTY_ADDRESS = {
  street: '',
  number: '',
  complement: '',
  neighborhoodId: '',
  cityId: '',
  state: '',
  zipCode: '',
}

const DEFAULT_VALUES: CreateShipmentFormValues = {
  type: 'RESIDENTIAL_MOVING',
  description: '',
  vehicleTypeRequired: 'ANY',
  scheduledDate: '',
  timeWindow: 'MORNING',
  customerSlaHours: 24,
  origin: EMPTY_ADDRESS,
  destination: EMPTY_ADDRESS,
  modifiers: [],
}

const SHIPMENT_TYPE_OPTIONS = Object.entries(SHIPMENT_TYPE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
)
const VEHICLE_TYPE_OPTIONS = Object.entries(VEHICLE_TYPE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
)
const TIME_WINDOW_OPTIONS = Object.entries(TIME_WINDOW_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
)
const SLA_OPTIONS = CUSTOMER_SLA_HOURS_OPTIONS.map((hours) => ({
  value: String(hours),
  label: `${hours}h`,
}))

// Faixas em vez de entrada numérica livre — evita o problema de decimal
// BR (vírgula) e dá uma escolha mais rápida pra uma estimativa (não precisa
// de precisão exata). Cada opção carrega um valor representativo da faixa.
const WEIGHT_RANGE_OPTIONS = [
  { value: '50', label: 'Até 100 kg' },
  { value: '200', label: '100 – 300 kg' },
  { value: '400', label: '300 – 500 kg' },
  { value: '750', label: '500 – 1.000 kg' },
  { value: '1500', label: 'Mais de 1.000 kg' },
]

const VOLUME_RANGE_OPTIONS = [
  { value: '2.5', label: 'Até 5 m³' },
  { value: '10', label: '5 – 15 m³' },
  { value: '22.5', label: '15 – 30 m³' },
  { value: '40', label: '30 – 50 m³' },
  { value: '60', label: 'Mais de 50 m³' },
]

export function CreateShipmentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const createShipment = useCreateShipment()
  const { data: neighborhoods = [], isLoading: isLoadingNeighborhoods } =
    useNeighborhoods()

  // Continuidade da busca pública de transportadores (S9-T3) — só
  // `vehicleTypeRequired` é prefilável de fato: `origin.cityId` não tem campo
  // próprio nesta tela (endereço é escolhido por bairro, que já deriva a
  // cidade), então prefill de cidade ficaria incompleto sem selecionar um
  // bairro específico — fora do escopo de "prefill simples" decidido.
  const vehicleTypeFromQuery = searchParams.get('vehicleTypeRequired')
  const isValidVehicleType = (value: string | null): value is CreateShipmentFormValues['vehicleTypeRequired'] =>
    Object.keys(VEHICLE_TYPE_LABELS).includes(value ?? '')

  const form = useForm<CreateShipmentFormValues>({
    resolver: zodResolver(CreateShipmentSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      vehicleTypeRequired: isValidVehicleType(vehicleTypeFromQuery)
        ? vehicleTypeFromQuery
        : DEFAULT_VALUES.vehicleTypeRequired,
    },
    mode: 'onChange',
  })

  const timeWindow = form.watch('timeWindow')
  const scheduledDate = form.watch('scheduledDate')

  const morningBlocked = scheduledDate
    ? isMorningWindowBlocked(scheduledDate)
    : false
  const timeWindowOptions = morningBlocked
    ? TIME_WINDOW_OPTIONS.filter((option) => option.value !== 'MORNING')
    : TIME_WINDOW_OPTIONS

  // mode: 'onChange' só valida a partir da 1ª interação — dispara uma
  // validação no mount pra o botão já nascer desabilitado (form vazio).
  useEffect(() => {
    form.trigger()
  }, [])

  // Se o dia agendado virou hoje depois do meio-dia (ou a hora avançou com
  // o form aberto), o turno "Manhã" deixa de ser válido — troca pro próximo
  // turno disponível em vez de deixar o form num estado que o Zod recusa.
  useEffect(() => {
    if (morningBlocked && timeWindow === 'MORNING') {
      form.setValue('timeWindow', 'AFTERNOON', { shouldValidate: true })
    }
  }, [morningBlocked, timeWindow])

  async function onSubmit(values: CreateShipmentFormValues) {
    try {
      // mapeia explicitamente pro shape da mutation GraphQL — o form (Zod)
      // carrega campos que a mutation não aceita no v1 (modifiers, lat/lng/
      // floor/hasElevator, ver Research), então não repassa `values` direto.
      await createShipment.mutateAsync({
        type: values.type,
        description: values.description,
        estimatedWeightKg: values.estimatedWeightKg,
        estimatedVolumeM3: values.estimatedVolumeM3,
        vehicleTypeRequired: values.vehicleTypeRequired,
        scheduledDate: values.scheduledDate,
        timeWindow: values.timeWindow,
        specificTime: values.specificTime,
        customerSlaHours: values.customerSlaHours,
        origin: {
          street: values.origin.street,
          number: values.origin.number,
          complement: values.origin.complement,
          neighborhoodId: values.origin.neighborhoodId,
          cityId: values.origin.cityId,
          state: values.origin.state,
          zipCode: values.origin.zipCode,
        },
        destination: {
          street: values.destination.street,
          number: values.destination.number,
          complement: values.destination.complement,
          neighborhoodId: values.destination.neighborhoodId,
          cityId: values.destination.cityId,
          state: values.destination.state,
          zipCode: values.destination.zipCode,
        },
      })
      router.push('/customer/shipments')
    } catch {
      // erro já exibido via toast (MutationCache) — mensagem específica
      // mapeada em use-create-shipment.ts
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 pb-24 md:pb-0"
      >
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de frete</FormLabel>
              <FormControl>
                <AdaptiveSelect
                  options={SHIPMENT_TYPE_OPTIONS}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="O que vai ser transportado?"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="estimatedWeightKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso estimado (kg)</FormLabel>
                <FormControl>
                  <AdaptiveSelect
                    options={WEIGHT_RANGE_OPTIONS}
                    getOptionValue={(o) => o.value}
                    getOptionLabel={(o) => o.label}
                    value={
                      field.value !== undefined
                        ? String(field.value)
                        : undefined
                    }
                    onValueChange={(v) => field.onChange(Number(v))}
                    placeholder="Selecione uma faixa"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estimatedVolumeM3"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Volume estimado (m³)</FormLabel>
                <FormControl>
                  <AdaptiveSelect
                    options={VOLUME_RANGE_OPTIONS}
                    getOptionValue={(o) => o.value}
                    getOptionLabel={(o) => o.label}
                    value={
                      field.value !== undefined
                        ? String(field.value)
                        : undefined
                    }
                    onValueChange={(v) => field.onChange(Number(v))}
                    placeholder="Selecione uma faixa"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="vehicleTypeRequired"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Veículo necessário</FormLabel>
              <FormControl>
                <AdaptiveSelect
                  options={VEHICLE_TYPE_OPTIONS}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="scheduledDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data agendada</FormLabel>
                <FormControl>
                  <AdaptiveDatePicker
                    label="Selecione a data agendada"
                    value={
                      field.value ? new Date(`${field.value}T00:00:00`) : null
                    }
                    onChange={(date) =>
                      // format local (não toISOString) — toISOString converte
                      // pra UTC e volta um dia em fusos negativos (ex.: -03:00)
                      field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timeWindow"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Janela de horário</FormLabel>
                <FormControl>
                  <AdaptiveSelect
                    options={timeWindowOptions}
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
        </div>

        {timeWindow === 'SPECIFIC' && (
          <FormField
            control={form.control}
            name="specificTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário específico</FormLabel>
                <FormControl>
                  <Input type="time" className="min-h-12" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="customerSlaHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prazo de resposta (SLA)</FormLabel>
              <FormControl>
                <AdaptiveSelect
                  options={SLA_OPTIONS}
                  getOptionValue={(o) => o.value}
                  getOptionLabel={(o) => o.label}
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <AddressFieldset
          form={form}
          prefix="origin"
          title="Origem"
          neighborhoods={neighborhoods}
          isLoadingNeighborhoods={isLoadingNeighborhoods}
        />
        <AddressFieldset
          form={form}
          prefix="destination"
          title="Destino"
          neighborhoods={neighborhoods}
          isLoadingNeighborhoods={isLoadingNeighborhoods}
        />

        <div className="bg-background sticky bottom-0 -mx-4 flex justify-end gap-2 border-t px-4 py-3 md:static md:mx-0 md:border-0 md:p-0">
          <Button
            type="submit"
            className="min-h-12 w-full md:w-auto"
            disabled={createShipment.isPending || !form.formState.isValid}
          >
            {createShipment.isPending ? 'Criando...' : 'Criar frete'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function AddressFieldset({
  form,
  prefix,
  title,
  neighborhoods,
  isLoadingNeighborhoods,
}: {
  form: ReturnType<typeof useForm<CreateShipmentFormValues>>
  prefix: 'origin' | 'destination'
  title: string
  neighborhoods: NeighborhoodOption[]
  isLoadingNeighborhoods: boolean
}) {
  async function handleCepBlur() {
    const digits = normalizeCep(form.getValues(`${prefix}.zipCode`))
    if (digits.length !== 8) return

    const result = await lookupCep(digits)
    if (!result.success) return

    if (result.data.addressLine && !form.getValues(`${prefix}.street`)) {
      form.setValue(`${prefix}.street`, result.data.addressLine, {
        shouldValidate: true,
      })
    }

    if (result.data.neighborhood && !form.getValues(`${prefix}.neighborhoodId`)) {
      const target = normalizeCityName(result.data.neighborhood)
      const matched = neighborhoods.find(
        (n) => normalizeCityName(n.name) === target,
      )
      if (matched) {
        form.setValue(`${prefix}.neighborhoodId`, matched.id, {
          shouldValidate: true,
        })
        form.setValue(`${prefix}.cityId`, matched.cityId, {
          shouldValidate: true,
        })
        form.setValue(`${prefix}.state`, matched.stateUf, {
          shouldValidate: true,
        })
      }
    }
  }

  return (
    <fieldset className="space-y-4">
      <legend className="text-base font-semibold">{title}</legend>

      <NeighborhoodSelectField
        form={form}
        prefix={prefix}
        label="Bairro"
        neighborhoods={neighborhoods}
        isLoading={isLoadingNeighborhoods}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
        <FormField
          control={form.control}
          name={`${prefix}.street`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rua</FormLabel>
              <FormControl>
                <Input className="min-h-12" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`${prefix}.number`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número</FormLabel>
              <FormControl>
                <Input className="min-h-12" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name={`${prefix}.complement`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Complemento</FormLabel>
              <FormControl>
                <Input className="min-h-12" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`${prefix}.zipCode`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <FormControl>
                <CepInput
                  className="min-h-12"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={() => {
                    field.onBlur()
                    handleCepBlur().catch(() => {})
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </fieldset>
  )
}
