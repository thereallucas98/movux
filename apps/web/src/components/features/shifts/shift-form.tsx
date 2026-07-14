'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { useTaxonomies } from '~/components/features/settings/_hooks/use-taxonomies'
import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { DateTimeRangePicker } from '~/components/ui/datetime-range-picker'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { Type } from '~/components/ui/type'
import { handlePlanLimitError } from '~/components/features/plan-limits/with-plan-limit-error-handler'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

import { useCreateShift } from './_hooks/use-create-shift'
import { useUpdateShift } from './_hooks/use-update-shift'
import type { ShiftRow } from './_hooks/use-shifts'
import type { ShiftAssignmentMode } from './shift-assignment-mode-tag'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

const baseShape = z.object({
  categoryId: z.uuid('Selecione uma categoria'),
  start: z.date({ message: 'Início obrigatório' }),
  end: z.date({ message: 'Fim obrigatório' }),
  headcount: z
    .number({ message: 'Informe um número' })
    .int('Apenas números inteiros')
    .min(1, 'Mínimo 1')
    .max(1000, 'Máximo 1000'),
  notes: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
})

function timeRefine(d: { start: Date; end: Date }) {
  if (d.start >= d.end) return false
  if (d.end.getTime() - d.start.getTime() > TWENTY_FOUR_HOURS_MS) return false
  return true
}

const createSchema = baseShape.refine(timeRefine, {
  message: 'Início deve ser antes do fim e máximo 24 horas',
  path: ['end'],
})

const editSchema = baseShape
  .extend({
    assignmentMode: z.enum(['DIRECT_ASSIGN', 'OPEN_FOR_APPLY']),
  })
  .refine(timeRefine, {
    message: 'Início deve ser antes do fim e máximo 24 horas',
    path: ['end'],
  })

type CreateValues = z.infer<typeof createSchema>
type EditValues = z.infer<typeof editSchema>

interface CommonProps {
  workspaceId: string
  scheduleId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CreateProps extends CommonProps {
  mode: 'create'
  initial?: undefined
}

interface EditProps extends CommonProps {
  mode: 'edit'
  initial: ShiftRow
}

type Props = CreateProps | EditProps

function errorCopy(code: string | null): string {
  switch (code) {
    case 'INVALID_STATE_TRANSITION':
      return 'Não é possível editar este turno no status atual.'
    case 'FORBIDDEN':
      return 'Sem permissão.'
    case 'NOT_FOUND':
      return 'Turno não encontrado.'
    case 'VALIDATION_ERROR':
      return 'Dados inválidos.'
    default:
      return 'Não foi possível salvar. Tente novamente.'
  }
}

export function ShiftForm(props: Props) {
  if (props.mode === 'edit') {
    return <EditShiftForm {...props} />
  }
  return <CreateShiftForm {...props} />
}

function CreateShiftForm({
  workspaceId,
  scheduleId,
  open,
  onOpenChange,
}: CreateProps) {
  const createMutation = useCreateShift(workspaceId, scheduleId)
  const categoriesQuery = useTaxonomies('categories', workspaceId)
  const categories = categoriesQuery.data ?? []

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    mode: 'onChange',
    defaultValues: {
      categoryId: '',
      start: undefined as unknown as Date,
      end: undefined as unknown as Date,
      headcount: 1,
      notes: '',
    },
  })

  async function onSubmit(values: CreateValues) {
    try {
      await createMutation.mutateAsync({
        categoryId: values.categoryId,
        startAt: values.start.toISOString(),
        endAt: values.end.toISOString(),
        headcount: values.headcount,
        notes: values.notes?.length ? values.notes : undefined,
      })
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'SHIFT_TIME_INVALID') {
        setError('end', { message: 'Horário inválido' })
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
      title="Novo turno"
      breakpoint="mobileOrTablet"
      contentClassName="md:max-w-[34rem] lg:max-w-[50rem]"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label>Categoria</Label>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
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
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-semibold">
            Início e fim
          </span>
          <Controller
            control={control}
            name="start"
            render={({ field: startField }) => (
              <Controller
                control={control}
                name="end"
                render={({ field: endField }) => (
                  <DateTimeRangePicker
                    value={{
                      start:
                        (startField.value as Date | undefined) ?? undefined,
                      end: (endField.value as Date | undefined) ?? undefined,
                    }}
                    onChange={(v) => {
                      startField.onChange(v.start ?? undefined)
                      endField.onChange(v.end ?? undefined)
                    }}
                    ariaInvalid={Boolean(errors.start || errors.end)}
                  />
                )}
              />
            )}
          />
          {(errors.start || errors.end) && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.end?.message ?? errors.start?.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="shift-headcount">Vagas</Label>
          <Input
            id="shift-headcount"
            type="number"
            min={1}
            max={1000}
            step={1}
            {...register('headcount', { valueAsNumber: true })}
            aria-invalid={errors.headcount ? true : undefined}
          />
          {errors.headcount && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.headcount.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="shift-notes">Notas (opcional)</Label>
          <Textarea
            id="shift-notes"
            placeholder="Observações para os colaboradores"
            {...register('notes')}
            aria-invalid={errors.notes ? true : undefined}
          />
          {errors.notes && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.notes.message}
            </span>
          )}
        </div>

        <p className="text-muted-foreground text-[12px]">
          Defina como aberto para inscrição depois de criar.
        </p>

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
            disabled={!isValid || isSubmitting}
            className={cn(isSubmitting && 'opacity-60')}
          >
            {isSubmitting ? 'Salvando…' : 'Criar turno'}
          </Button>
        </div>
      </form>
    </AdaptiveDialog>
  )
}

function EditShiftForm({
  workspaceId,
  scheduleId,
  open,
  onOpenChange,
  initial,
}: EditProps) {
  const updateMutation = useUpdateShift(workspaceId, scheduleId)
  const categoriesQuery = useTaxonomies('categories', workspaceId)
  const categories = categoriesQuery.data ?? []

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    mode: 'onChange',
    defaultValues: {
      categoryId: initial.categoryId,
      start: new Date(initial.startAt),
      end: new Date(initial.endAt),
      headcount: initial.headcount,
      notes: initial.notes ?? '',
      assignmentMode: initial.assignmentMode,
    },
  })

  async function onSubmit(values: EditValues) {
    try {
      const patch: Record<string, unknown> = {}
      if (values.categoryId !== initial.categoryId) {
        patch.categoryId = values.categoryId
      }
      const newStart = values.start.toISOString()
      if (newStart !== new Date(initial.startAt).toISOString()) {
        patch.startAt = newStart
      }
      const newEnd = values.end.toISOString()
      if (newEnd !== new Date(initial.endAt).toISOString()) {
        patch.endAt = newEnd
      }
      if (values.headcount !== initial.headcount) {
        patch.headcount = values.headcount
      }
      const newNotes = values.notes?.length ? values.notes : null
      if ((initial.notes ?? null) !== newNotes) {
        patch.notes = newNotes
      }
      if (values.assignmentMode !== initial.assignmentMode) {
        patch.assignmentMode = values.assignmentMode
      }
      if (Object.keys(patch).length === 0) {
        onOpenChange(false)
        return
      }
      await updateMutation.mutateAsync({ id: initial.id, ...patch })
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'SHIFT_TIME_INVALID') {
        setError('end', { message: 'Horário inválido' })
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
      title="Editar turno"
      breakpoint="mobileOrTablet"
      contentClassName="md:max-w-[34rem] lg:max-w-[50rem]"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label>Categoria</Label>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
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
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-semibold">
            Início e fim
          </span>
          <Controller
            control={control}
            name="start"
            render={({ field: startField }) => (
              <Controller
                control={control}
                name="end"
                render={({ field: endField }) => (
                  <DateTimeRangePicker
                    value={{
                      start:
                        (startField.value as Date | undefined) ?? undefined,
                      end: (endField.value as Date | undefined) ?? undefined,
                    }}
                    onChange={(v) => {
                      startField.onChange(v.start ?? undefined)
                      endField.onChange(v.end ?? undefined)
                    }}
                    ariaInvalid={Boolean(errors.start || errors.end)}
                  />
                )}
              />
            )}
          />
          {(errors.start || errors.end) && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.end?.message ?? errors.start?.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="shift-headcount">Vagas</Label>
          <Input
            id="shift-headcount"
            type="number"
            min={1}
            max={1000}
            step={1}
            {...register('headcount', { valueAsNumber: true })}
            aria-invalid={errors.headcount ? true : undefined}
          />
          {errors.headcount && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.headcount.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="shift-notes">Notas (opcional)</Label>
          <Textarea
            id="shift-notes"
            placeholder="Observações para os colaboradores"
            {...register('notes')}
            aria-invalid={errors.notes ? true : undefined}
          />
          {errors.notes && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.notes.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-semibold">
            Modo de atribuição
          </span>
          <Controller
            control={control}
            name="assignmentMode"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(v) => field.onChange(v as ShiftAssignmentMode)}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="DIRECT_ASSIGN"
                    id="mode-direct-assign"
                  />
                  <Label htmlFor="mode-direct-assign" className="font-normal">
                    Atribuição direta
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="OPEN_FOR_APPLY"
                    id="mode-open-for-apply"
                  />
                  <Label htmlFor="mode-open-for-apply" className="font-normal">
                    Aberto para inscrição
                  </Label>
                </div>
              </RadioGroup>
            )}
          />
        </div>

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
            disabled={!isValid || isSubmitting || !isDirty}
            className={cn(isSubmitting && 'opacity-60')}
          >
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </AdaptiveDialog>
  )
}
