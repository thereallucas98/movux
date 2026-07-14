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
import { cn } from '~/lib/utils'

const VERTICAL_OPTIONS: Array<{
  value: 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'
  label: string
  Icon: LucideIcon
}> = [
  { value: 'HOSPITAL', label: 'Hospital', Icon: Stethoscope },
  { value: 'CLINIC', label: 'Clínica', Icon: Building2 },
  { value: 'GYM', label: 'Academia', Icon: Dumbbell },
  { value: 'OTHER', label: 'Outro', Icon: Briefcase },
]

const schema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100'),
  vertical: z.enum(['HOSPITAL', 'CLINIC', 'GYM', 'OTHER'], {
    message: 'Selecione um tipo',
  }),
})
type Values = z.infer<typeof schema>

interface Props {
  tenantId: string
  onSuccess: (input: { workspaceId: string; membershipId: string }) => void
}

function errorCopy(code: string | undefined): string {
  switch (code) {
    case 'FORBIDDEN':
      return 'Sem permissão para criar workspace nesta organização.'
    case 'NOT_FOUND':
      return 'Organização não encontrada.'
    case 'VALIDATION_ERROR':
      return 'Dados inválidos.'
    default:
      return 'Não foi possível criar o workspace. Tente novamente.'
  }
}

export function StepCreateWorkspace({ tenantId, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      vertical: undefined as unknown as Values['vertical'],
    },
  })

  async function onSubmit(values: Values) {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        tenantId,
        name: values.name,
        vertical: values.vertical,
        timezone: 'America/Sao_Paulo',
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError('root', { message: errorCopy(body?.code) })
      return
    }
    const json = (await res.json()) as {
      workspace: { id: string }
      membership: { id: string }
    }
    const workspaceId = json.workspace.id
    const membershipId = json.membership.id

    // Set tn_ws cookie so subsequent navigation reads the new workspace.
    await fetch('/api/workspace/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ workspaceId }),
    }).catch(() => undefined)

    // Don't router.refresh() here — would re-run /onboarding/page.tsx which
    // redirects to /dashboard once a workspace exists, killing the next step.
    // The wizard's final router.push('/dashboard') re-evaluates (app) layout.
    onSuccess({ workspaceId, membershipId })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
          <Building2 className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-foreground text-[20px] leading-[28px] font-bold">
            Crie seu primeiro workspace
          </h1>
          <p className="text-muted-foreground text-[14px] leading-[20px]">
            Workspaces são unidades operacionais — uma por filial, prédio ou
            estúdio.
          </p>
        </div>
      </header>

      <label className="flex flex-col gap-2">
        <span className="text-foreground text-[14px] leading-[20px] font-medium">
          Nome do workspace
        </span>
        <Input
          {...register('name')}
          placeholder="UTI - Unidade Centro"
          aria-invalid={errors.name ? true : undefined}
          autoComplete="off"
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
        {errors.vertical && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.vertical.message}
          </span>
        )}
      </fieldset>

      {errors.root && <Type variant="danger">{errors.root.message}</Type>}

      <Button
        type="submit"
        variant="solid"
        size="md"
        disabled={!isValid || isSubmitting}
        className={cn('w-full', isSubmitting && 'opacity-60')}
      >
        {isSubmitting ? 'Criando…' : 'Próximo'}
      </Button>
    </form>
  )
}
