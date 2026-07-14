'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Briefcase,
  Building2,
  Dumbbell,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Type } from '~/components/ui/type'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

import { useUpdateWorkspace } from './_hooks/use-update-workspace'
import type {
  WorkspaceRole,
  WorkspaceVertical,
} from './_hooks/use-workspace-with-members'

const TIMEZONE_OPTIONS = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Recife',
  'America/Fortaleza',
  'America/Cuiaba',
  'America/Bahia',
  'America/Belem',
  'America/Boa_Vista',
  'America/Porto_Velho',
  'America/Rio_Branco',
] as const

const VERTICAL_OPTIONS: Array<{
  value: WorkspaceVertical
  label: string
  Icon: LucideIcon
}> = [
  { value: 'HOSPITAL', label: 'Hospital', Icon: Stethoscope },
  { value: 'CLINIC', label: 'Clínica', Icon: Building2 },
  { value: 'GYM', label: 'Academia', Icon: Dumbbell },
  { value: 'OTHER', label: 'Outro', Icon: Briefcase },
]

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Mínimo 2 caracteres')
      .max(100, 'Máximo 100'),
    vertical: z.enum(['HOSPITAL', 'CLINIC', 'GYM', 'OTHER']),
    timezone: z.string().trim().min(1, 'Obrigatório'),
  })
  .refine(
    (d) => d.name !== '' || d.vertical !== undefined || d.timezone !== '',
    { message: 'Altere ao menos um campo' },
  )

type Values = z.infer<typeof schema>

interface Props {
  workspaceId: string
  initial: {
    name: string
    timezone: string
    vertical: WorkspaceVertical
  }
  onCancel: () => void
  onSuccess: () => void
}

function errorCopy(code: string | null): string {
  switch (code) {
    case 'FORBIDDEN':
      return 'Sem permissão para editar este workspace.'
    case 'VALIDATION_ERROR':
      return 'Dados inválidos.'
    default:
      return 'Não foi possível atualizar. Tente novamente.'
  }
}

export function WorkspaceInfoForm({
  workspaceId,
  initial,
  onCancel,
  onSuccess,
}: Props) {
  const mutation = useUpdateWorkspace(workspaceId)

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: initial,
  })

  async function onSubmit(values: Values) {
    const patch: Partial<Values> = {}
    if (values.name !== initial.name) patch.name = values.name
    if (values.vertical !== initial.vertical) patch.vertical = values.vertical
    if (values.timezone !== initial.timezone) patch.timezone = values.timezone

    if (Object.keys(patch).length === 0) {
      onCancel()
      return
    }

    try {
      await mutation.mutateAsync(patch)
      onSuccess()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      setError('root', { message: errorCopy(code) })
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      <label className="flex flex-col gap-2">
        <span className="text-foreground text-[14px] leading-[20px] font-medium">
          Nome
        </span>
        <Input
          {...register('name')}
          aria-invalid={errors.name ? true : undefined}
        />
        {errors.name && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.name.message}
          </span>
        )}
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-foreground text-[14px] leading-[20px] font-medium">
          Vertical
        </legend>
        <Controller
          control={control}
          name="vertical"
          render={({ field }) => (
            <div role="radiogroup" className="grid grid-cols-2 gap-3">
              {VERTICAL_OPTIONS.map(({ value, label, Icon }) => {
                const selected = field.value === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={label}
                    onClick={() => field.onChange(value)}
                    className={cn(
                      'border-border bg-background flex flex-col items-center gap-2 rounded-[12px] border px-3 py-4 transition-colors',
                      'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-6',
                        selected ? 'text-primary' : 'text-muted-foreground',
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        'text-[14px] font-medium',
                        selected ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        />
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="text-foreground text-[14px] leading-[20px] font-medium">
          Fuso horário
        </span>
        <Input
          {...register('timezone')}
          list="settings-timezone-options"
          aria-invalid={errors.timezone ? true : undefined}
        />
        <datalist id="settings-timezone-options">
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
        {errors.timezone && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.timezone.message}
          </span>
        )}
      </label>

      {errors.root && <Type variant="danger">{errors.root.message}</Type>}

      <div className="flex flex-row gap-2">
        <Button
          type="submit"
          variant="solid"
          size="md"
          disabled={!isDirty || isSubmitting}
        >
          {isSubmitting ? 'Salvando…' : 'Salvar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

export type { WorkspaceRole }
