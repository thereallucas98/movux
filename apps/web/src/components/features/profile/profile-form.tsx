'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { DatePicker } from '~/components/ui/date-picker'
import { E164PhoneInput } from '~/components/ui/e164-phone-input'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Skeleton } from '~/components/ui/skeleton'
import { Textarea } from '~/components/ui/textarea'
import { Type } from '~/components/ui/type'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

import { useMe, type MeProfile } from './_hooks/use-me'
import { useUpdateMe, type UpdateMePatch } from './_hooks/use-update-me'

const E164_REGEX = /^\+[1-9]\d{7,14}$/

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  phone: z
    .string()
    .trim()
    .regex(E164_REGEX, 'Telefone inválido')
    .or(z.literal(''))
    .optional(),
  avatarUrl: z
    .string()
    .trim()
    .url('URL inválida')
    .max(500, 'Máximo 500 caracteres')
    .or(z.literal(''))
    .optional(),
  dateOfBirth: z
    .date()
    .max(new Date(), 'Data não pode ser futura')
    .nullable()
    .optional(),
  bio: z
    .string()
    .trim()
    .max(280, 'Máximo 280 caracteres')
    .or(z.literal(''))
    .optional(),
  emergencyContactName: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .or(z.literal(''))
    .optional(),
  emergencyContactPhone: z
    .string()
    .trim()
    .regex(E164_REGEX, 'Telefone inválido')
    .or(z.literal(''))
    .optional(),
})

type ProfileValues = z.infer<typeof profileSchema>

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function defaultsFromMe(me: MeProfile): ProfileValues {
  return {
    fullName: me.fullName,
    phone: me.phone ?? '',
    avatarUrl: me.avatarUrl ?? '',
    dateOfBirth: me.dateOfBirth ? new Date(me.dateOfBirth) : null,
    bio: me.bio ?? '',
    emergencyContactName: me.emergencyContactName ?? '',
    emergencyContactPhone: me.emergencyContactPhone ?? '',
  }
}

function buildPatch(
  before: ProfileValues,
  after: ProfileValues,
): UpdateMePatch {
  const patch: UpdateMePatch = {}
  if (after.fullName !== before.fullName) patch.fullName = after.fullName
  if ((after.phone ?? '') !== (before.phone ?? '')) {
    patch.phone = after.phone === '' ? null : (after.phone ?? null)
  }
  if ((after.avatarUrl ?? '') !== (before.avatarUrl ?? '')) {
    patch.avatarUrl = after.avatarUrl === '' ? null : (after.avatarUrl ?? null)
  }
  const beforeDob = before.dateOfBirth?.toISOString().slice(0, 10) ?? null
  const afterDob = after.dateOfBirth?.toISOString().slice(0, 10) ?? null
  if (beforeDob !== afterDob) {
    patch.dateOfBirth = afterDob
  }
  if ((after.bio ?? '') !== (before.bio ?? '')) {
    patch.bio = after.bio === '' ? null : (after.bio ?? null)
  }
  if (
    (after.emergencyContactName ?? '') !== (before.emergencyContactName ?? '')
  ) {
    patch.emergencyContactName =
      after.emergencyContactName === ''
        ? null
        : (after.emergencyContactName ?? null)
  }
  if (
    (after.emergencyContactPhone ?? '') !== (before.emergencyContactPhone ?? '')
  ) {
    patch.emergencyContactPhone =
      after.emergencyContactPhone === ''
        ? null
        : (after.emergencyContactPhone ?? null)
  }
  return patch
}

export function ProfileForm() {
  const meQuery = useMe()
  const updateMutation = useUpdateMe()

  const initialDefaults = useMemo<ProfileValues>(
    () => ({
      fullName: '',
      phone: '',
      avatarUrl: '',
      dateOfBirth: null,
      bio: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    }),
    [],
  )

  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: initialDefaults,
  })

  // Reset form once me data arrives.
  useEffect(() => {
    if (meQuery.data) reset(defaultsFromMe(meQuery.data))
  }, [meQuery.data, reset])

  const bio = watch('bio') ?? ''
  const avatarUrl = watch('avatarUrl') ?? ''
  const fullName = watch('fullName') ?? ''

  async function onSubmit(values: ProfileValues) {
    if (!meQuery.data) return
    const patch = buildPatch(defaultsFromMe(meQuery.data), values)
    if (Object.keys(patch).length === 0) {
      toast.success('Nada a salvar.')
      return
    }
    try {
      await updateMutation.mutateAsync(patch)
      toast.success('Perfil atualizado')
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 400
          ? 'Dados inválidos. Revise os campos e tente novamente.'
          : 'Não foi possível salvar.'
      setError('root', { message })
    }
  }

  if (meQuery.isLoading) {
    return (
      <Card className="flex flex-col gap-4 p-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </Card>
    )
  }

  if (meQuery.isError || !meQuery.data) {
    return (
      <Card className="flex flex-col gap-2 p-6">
        <h2 className="text-foreground text-[18px] font-semibold">Perfil</h2>
        <p className="text-muted-foreground text-[14px]">
          Não foi possível carregar seu perfil.
        </p>
        <Button
          type="button"
          variant="outline"
          size="md"
          className="self-start"
          onClick={() => meQuery.refetch()}
        >
          Tentar novamente
        </Button>
      </Card>
    )
  }

  const bioCount = [...bio].length

  return (
    <Card className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-foreground text-[18px] font-semibold">Perfil</h2>
        <p className="text-muted-foreground text-[14px]">
          Atualize suas informações pessoais.
        </p>
      </header>

      <div className="flex items-center gap-4">
        <Avatar size="lg">
          {avatarUrl && (
            <AvatarImage
              src={avatarUrl}
              alt={fullName}
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
          <AvatarFallback>{initialsFor(fullName)}</AvatarFallback>
        </Avatar>
        <div className="text-muted-foreground text-[13px]">
          Cole a URL pública da imagem no campo abaixo.
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-full-name">Nome completo</Label>
          <Input
            id="profile-full-name"
            {...register('fullName')}
            aria-invalid={errors.fullName ? true : undefined}
          />
          {errors.fullName && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.fullName.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-phone">Telefone</Label>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <E164PhoneInput
                id="profile-phone"
                value={field.value ?? ''}
                onChange={field.onChange}
                ariaInvalid={Boolean(errors.phone)}
              />
            )}
          />
          {errors.phone && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.phone.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-avatar-url">URL do avatar</Label>
          <Input
            id="profile-avatar-url"
            type="url"
            placeholder="https://..."
            {...register('avatarUrl')}
            aria-invalid={errors.avatarUrl ? true : undefined}
          />
          {errors.avatarUrl && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.avatarUrl.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Data de nascimento</Label>
          <Controller
            control={control}
            name="dateOfBirth"
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={(d) => field.onChange(d ?? null)}
                placeholder="Selecione uma data"
              />
            )}
          />
          {errors.dateOfBirth && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.dateOfBirth.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-bio">Bio</Label>
          <Textarea
            id="profile-bio"
            placeholder="Conte um pouco sobre você"
            {...register('bio')}
            aria-invalid={errors.bio ? true : undefined}
          />
          <div className="flex items-center justify-between">
            {errors.bio ? (
              <span className="text-destructive text-[13px] font-medium">
                {errors.bio.message}
              </span>
            ) : (
              <span />
            )}
            <span
              className={cn(
                'text-muted-foreground text-[12px]',
                bioCount > 280 && 'text-destructive',
              )}
            >
              {bioCount}/280
            </span>
          </div>
        </div>

        <fieldset className="flex flex-col gap-3 rounded-[10px] border p-4">
          <legend className="text-foreground px-1 text-[14px] font-semibold">
            Contato de emergência
          </legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-em-name">Nome</Label>
              <Input
                id="profile-em-name"
                {...register('emergencyContactName')}
                aria-invalid={errors.emergencyContactName ? true : undefined}
              />
              {errors.emergencyContactName && (
                <span className="text-destructive text-[13px] font-medium">
                  {errors.emergencyContactName.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-em-phone">Telefone</Label>
              <Controller
                control={control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <E164PhoneInput
                    id="profile-em-phone"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    ariaInvalid={Boolean(errors.emergencyContactPhone)}
                  />
                )}
              />
              {errors.emergencyContactPhone && (
                <span className="text-destructive text-[13px] font-medium">
                  {errors.emergencyContactPhone.message}
                </span>
              )}
            </div>
          </div>
        </fieldset>

        {errors.root && <Type variant="danger">{errors.root.message}</Type>}

        <div className="flex flex-row justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => reset(defaultsFromMe(meQuery.data))}
            disabled={isSubmitting || !isDirty}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="solid"
            size="md"
            disabled={!isValid || !isDirty || isSubmitting}
            className={cn(isSubmitting && 'opacity-60')}
          >
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
