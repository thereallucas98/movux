'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { DateRangePicker } from '~/components/ui/date-range-picker'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Type } from '~/components/ui/type'
import { useTaxonomies } from '~/components/features/settings/_hooks/use-taxonomies'
import { handlePlanLimitError } from '~/components/features/plan-limits/with-plan-limit-error-handler'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

import { useCreateSchedule } from './_hooks/use-create-schedule'
import { useUpdateSchedule } from './_hooks/use-update-schedule'
import type { ScheduleStatus } from './schedule-status-tag'

const schema = z
  .object({
    categoryId: z.uuid('Selecione uma categoria'),
    name: z
      .string()
      .trim()
      .max(120, 'Máximo 120 caracteres')
      .optional()
      .or(z.literal('')),
    periodStart: z.date({ message: 'Data inicial obrigatória' }),
    periodEnd: z.date({ message: 'Data final obrigatória' }),
  })
  .refine((d) => d.periodStart < d.periodEnd, {
    message: 'A data inicial deve ser antes da final.',
    path: ['periodEnd'],
  })

type Values = z.infer<typeof schema>

interface CommonProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CreateProps extends CommonProps {
  mode: 'create'
  initial?: undefined
}

interface EditProps extends CommonProps {
  mode: 'edit'
  initial: {
    id: string
    status: ScheduleStatus
    categoryId: string
    name: string | null
    periodStart: string
    periodEnd: string
  }
}

type Props = CreateProps | EditProps

function errorCopy(code: string | null): string {
  switch (code) {
    case 'SCHEDULE_PERIOD_OVERLAP':
      return 'Já existe uma escala que cobre esse período nesta categoria.'
    case 'INVALID_STATE_TRANSITION':
      return 'Não é possível editar essa escala no status atual.'
    case 'FORBIDDEN':
      return 'Sem permissão.'
    case 'NOT_FOUND':
      return 'Escala não encontrada.'
    case 'VALIDATION_ERROR':
      return 'Dados inválidos.'
    default:
      return 'Não foi possível salvar. Tente novamente.'
  }
}

function toIsoDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function ScheduleForm(props: Props) {
  const { workspaceId, open, onOpenChange, mode } = props
  const createMutation = useCreateSchedule(workspaceId)
  const updateMutation = useUpdateSchedule(workspaceId)
  const categoriesQuery = useTaxonomies('categories', workspaceId)
  const categories = categoriesQuery.data ?? []

  const isEdit = mode === 'edit'
  const isPublished = isEdit && props.initial.status === 'PUBLISHED'
  const lockNonName = isPublished

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: isEdit
      ? {
          categoryId: props.initial.categoryId,
          name: props.initial.name ?? '',
          periodStart: new Date(props.initial.periodStart),
          periodEnd: new Date(props.initial.periodEnd),
        }
      : {
          categoryId: '',
          name: '',
          periodStart: undefined as unknown as Date,
          periodEnd: undefined as unknown as Date,
        },
  })

  async function onSubmit(values: Values) {
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          categoryId: values.categoryId,
          name: values.name?.length ? values.name : undefined,
          periodStart: toIsoDate(values.periodStart),
          periodEnd: toIsoDate(values.periodEnd),
        })
      } else {
        const initial = props.initial
        const patch: Record<string, unknown> = {}
        const newName = values.name?.length ? values.name : null
        if ((initial.name ?? null) !== newName) patch.name = newName
        if (!lockNonName) {
          if (values.categoryId !== initial.categoryId) {
            patch.categoryId = values.categoryId
          }
          const newStart = toIsoDate(values.periodStart)
          if (newStart !== initial.periodStart.slice(0, 10)) {
            patch.periodStart = newStart
          }
          const newEnd = toIsoDate(values.periodEnd)
          if (newEnd !== initial.periodEnd.slice(0, 10)) {
            patch.periodEnd = newEnd
          }
        }
        if (Object.keys(patch).length === 0) {
          onOpenChange(false)
          return
        }
        await updateMutation.mutateAsync({ id: initial.id, ...patch })
      }
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'SCHEDULE_PERIOD_OVERLAP') {
        setError('periodEnd', { message: errorCopy(code) })
        return
      }
      if (code === 'PLAN_LIMIT_REACHED') {
        handlePlanLimitError(err, {
          onSimpleOrBoolean: (msg) => setError('root', { message: msg }),
        })
        return
      }
      setError('root', { message: errorCopy(code) })
    }
  }

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar escala' : 'Nova escala'}
      description={
        lockNonName
          ? 'Após publicação, apenas o nome pode ser alterado.'
          : undefined
      }
      breakpoint="mobileOrTablet"
      contentClassName="md:max-w-[34rem] lg:max-w-[50rem]"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <label className="flex flex-col gap-2">
          <span className="text-foreground text-[14px] font-medium">
            Categoria
          </span>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select
                value={field.value || ''}
                onValueChange={field.onChange}
                disabled={lockNonName}
              >
                <SelectTrigger
                  className="h-12"
                  aria-invalid={errors.categoryId ? true : undefined}
                >
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoryId && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.categoryId.message}
            </span>
          )}
          {lockNonName && (
            <span className="text-muted-foreground text-[12px]">
              Não editável após publicação.
            </span>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-foreground text-[14px] font-medium">
            Nome (opcional)
          </span>
          <Input
            {...register('name')}
            placeholder="Ex.: Escala Maio - UTI"
            aria-invalid={errors.name ? true : undefined}
          />
          {errors.name && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.name.message}
            </span>
          )}
        </label>

        <Controller
          control={control}
          name="periodStart"
          render={({ field: startField }) => (
            <Controller
              control={control}
              name="periodEnd"
              render={({ field: endField }) => (
                <label className="flex flex-col gap-2">
                  <span className="text-foreground text-[14px] font-medium">
                    Período
                  </span>
                  <DateRangePicker
                    value={{
                      from: startField.value ?? undefined,
                      to: endField.value ?? undefined,
                    }}
                    onChange={(range) => {
                      startField.onChange(range?.from ?? undefined)
                      endField.onChange(range?.to ?? undefined)
                    }}
                    placeholder="Selecione o período"
                    disabled={lockNonName}
                  />
                  {(errors.periodStart || errors.periodEnd) && (
                    <span className="text-destructive text-[13px] font-medium">
                      {errors.periodEnd?.message ?? errors.periodStart?.message}
                    </span>
                  )}
                  {lockNonName && (
                    <span className="text-muted-foreground text-[12px]">
                      Não editável após publicação.
                    </span>
                  )}
                </label>
              )}
            />
          )}
        />

        {errors.root && <Type variant="danger">{errors.root.message}</Type>}

        <div className="flex flex-row justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="solid"
            size="md"
            disabled={!isValid || isSubmitting || (mode === 'edit' && !isDirty)}
            className={cn(isSubmitting && 'opacity-60')}
          >
            {isSubmitting ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar escala'}
          </Button>
        </div>
      </form>
    </AdaptiveDialog>
  )
}
