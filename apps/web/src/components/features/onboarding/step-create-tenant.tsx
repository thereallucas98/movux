'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Type } from '~/components/ui/type'
import { cn } from '~/lib/utils'

const schema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100'),
})
type Values = z.infer<typeof schema>

interface Props {
  onSuccess: (tenantId: string) => void
}

function errorCopy(code: string | undefined): string {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'Nome inválido.'
    case 'UNAUTHENTICATED':
      return 'Sessão expirada. Faça login novamente.'
    default:
      return 'Não foi possível criar a organização. Tente novamente.'
  }
}

export function StepCreateTenant({ onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { name: '' },
  })

  async function onSubmit(values: Values) {
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: values.name }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError('root', { message: errorCopy(body?.code) })
      return
    }
    const json = (await res.json()) as { tenant: { id: string } }
    onSuccess(json.tenant.id)
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
            Crie sua organização
          </h1>
          <p className="text-muted-foreground text-[14px] leading-[20px]">
            Esse é o nome do seu hospital, clínica ou academia.
          </p>
        </div>
      </header>

      <label className="flex flex-col gap-2">
        <span className="text-foreground text-[14px] leading-[20px] font-medium">
          Nome da organização
        </span>
        <Input
          {...register('name')}
          placeholder="Hospital Acme"
          aria-invalid={errors.name ? true : undefined}
          autoFocus
          autoComplete="organization"
        />
        {errors.name && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.name.message}
          </span>
        )}
      </label>

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
