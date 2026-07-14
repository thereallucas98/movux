'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { handlePlanLimitError } from '~/components/features/plan-limits/with-plan-limit-error-handler'
import { ApiError } from '~/lib/api-error'

import { type InviteRole, useAddMember } from './_hooks/use-add-member'
import { useTaxonomies } from './_hooks/use-taxonomies'

const schema = z.object({
  email: z.email('Email inválido').transform((e) => e.trim().toLowerCase()),
  role: z.enum(['COORDENADOR', 'COLABORADOR']),
  specialtyId: z.uuid('Profissão é obrigatória'),
})

type Values = z.infer<typeof schema>

interface Props {
  workspaceId: string
  onSuccess?: () => void
  onCancel?: () => void
}

function errorCopy(code: string | null): string {
  switch (code) {
    case 'TARGET_USER_NOT_FOUND':
      return 'Usuário não encontrado'
    case 'ALREADY_MEMBER':
      return 'Já é membro deste workspace'
    case 'FORBIDDEN':
      return 'Sem permissão para adicionar membros'
    case 'VALIDATION_ERROR':
      return 'Email inválido'
    default:
      return 'Falha ao adicionar membro'
  }
}

export function AddMemberForm({ workspaceId, onSuccess, onCancel }: Props) {
  const mutation = useAddMember(workspaceId)
  const specialties = useTaxonomies('specialties', workspaceId)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { email: '', role: 'COLABORADOR', specialtyId: '' },
  })

  async function onSubmit(values: Values) {
    try {
      await mutation.mutateAsync({
        email: values.email,
        role: values.role as InviteRole,
        specialtyId: values.specialtyId,
      })
      reset({ email: '', role: 'COLABORADOR', specialtyId: '' })
      onSuccess?.()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'PLAN_LIMIT_REACHED') {
        handlePlanLimitError(err, {
          onSimpleOrBoolean: (msg) => setError('root', { message: msg }),
        })
        return
      }
      setError('email', { message: errorCopy(code) })
    }
  }

  const role = watch('role')
  const specialtyId = watch('specialtyId')

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-border bg-muted/40 flex flex-col gap-3 rounded-[12px] border p-4"
      noValidate
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative flex-1">
          <Mail
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            {...register('email')}
            type="email"
            placeholder="email@exemplo.com"
            aria-label="Email do convidado"
            aria-invalid={errors.email ? true : undefined}
            className="pl-10"
          />
        </div>
        <Select
          value={role}
          onValueChange={(v) => setValue('role', v as InviteRole)}
        >
          <SelectTrigger className="h-12 w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="COLABORADOR">Colaborador</SelectItem>
            <SelectItem value="COORDENADOR">Coordenador</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={specialtyId}
          onValueChange={(v) =>
            setValue('specialtyId', v, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        >
          <SelectTrigger
            className="h-12 w-full sm:w-56"
            aria-label="Profissão"
            aria-invalid={errors.specialtyId ? true : undefined}
          >
            <SelectValue placeholder="Profissão" />
          </SelectTrigger>
          <SelectContent>
            {specialties.data?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {errors.email && (
        <p className="text-destructive text-[13px] font-medium">
          {errors.email.message}
        </p>
      )}
      {errors.specialtyId && (
        <p className="text-destructive text-[13px] font-medium">
          {errors.specialtyId.message}
        </p>
      )}
      {errors.root && (
        <p className="text-destructive text-[13px] font-medium">
          {errors.root.message}
        </p>
      )}
      <div className="flex flex-row gap-2">
        <Button
          type="submit"
          variant="solid"
          size="sm"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? 'Adicionando…' : 'Adicionar'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
