'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, LogIn, Mail, Phone, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { AuthField, authInputCls } from '~/components/features/auth/auth-field'
import { t } from '~/i18n/t'
import { api, ApiClientError } from '~/lib/api-client'
import { cn } from '~/lib/utils'

const registerSchema = z
  .object({
    fullName: z.string().min(2, { message: t('auth.register.fullName.min') }),
    email: z.email({ message: t('auth.email.invalid') }),
    password: z.string().min(8, { message: t('auth.password.min') }),
    confirmPassword: z.string().min(8, { message: t('auth.password.min') }),
    role: z.enum(['CUSTOMER', 'CARRIER']),
    phone: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: t('auth.register.confirmPassword.mismatch'),
    path: ['confirmPassword'],
  })
  .refine((d) => d.role !== 'CARRIER' || !!d.phone?.trim(), {
    message: t('auth.register.phone.required'),
    path: ['phone'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

interface RegisterResponse {
  user: { id: string; email: string; fullName: string; role: string }
}

const ROLE_OPTIONS: { value: 'CUSTOMER' | 'CARRIER'; label: string }[] = [
  { value: 'CUSTOMER', label: t('auth.register.role.customer') },
  { value: 'CARRIER', label: t('auth.register.role.carrier') },
]

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Continuidade da busca pública de transportadores (S9-T3) — prefill
  // simples via query string, sem persistir nenhum lead no banco.
  const roleFromQuery =
    searchParams.get('role') === 'CARRIER' ? 'CARRIER' : 'CUSTOMER'
  const cityIdFromQuery = searchParams.get('cityId')
  const vehicleTypeFromQuery = searchParams.get('vehicleType')

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: roleFromQuery,
      phone: '',
    },
  })

  const role = watch('role')
  const passwordValue = watch('password')
  const confirmValue = watch('confirmPassword')

  // Re-validate confirmPassword whenever password changes so the match error
  // clears/reappears in real time (zod `.refine` runs on the object, so this
  // ensures the second field's error tracks the first).
  useEffect(() => {
    if (confirmValue !== '' || passwordValue !== '') {
      trigger('confirmPassword').catch(() => undefined)
    }
  }, [passwordValue, confirmValue, trigger])

  async function onSubmit(values: RegisterFormValues) {
    try {
      const { user } = await api.post<RegisterResponse>('/api/auth/register', {
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: values.role,
        phone: values.phone?.trim() || undefined,
      })
      if (user.role === 'CARRIER') {
        router.push('/carrier/dashboard')
        return
      }

      if (cityIdFromQuery) {
        const params = new URLSearchParams({ cityId: cityIdFromQuery })
        if (vehicleTypeFromQuery) {
          params.set('vehicleTypeRequired', vehicleTypeFromQuery)
        }
        router.push(`/customer/shipments/new?${params.toString()}`)
        return
      }

      router.push('/customer/dashboard')
    } catch (err) {
      // O servidor só retorna mensagens em inglês — nunca mostrar
      // err.message direto, mapear pelo status pra uma cópia PT-BR.
      const message =
        err instanceof ApiClientError && err.status === 409
          ? t('auth.register.emailInUse')
          : t('auth.register.error')
      setError('root', { message })
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      <div className="flex flex-col gap-4">
        <AuthField label={t('auth.register.role.label')}>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setValue('role', option.value)
                  trigger('phone').catch(() => undefined)
                }}
                aria-pressed={role === option.value}
                className={cn(
                  'flex h-12 w-full items-center justify-center rounded-[8px] border px-4 text-[16px] font-medium transition-colors',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  role === option.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-background text-foreground hover:bg-accent',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </AuthField>

        <AuthField
          label={t('auth.register.fullName.label')}
          error={errors.fullName?.message}
        >
          <div className="relative">
            <UserRound
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              {...register('fullName')}
              type="text"
              placeholder={t('auth.register.fullName.placeholder')}
              autoComplete="name"
              aria-invalid={errors.fullName ? true : undefined}
              className={cn(authInputCls, 'pl-10')}
            />
          </div>
        </AuthField>

        <AuthField label={t('auth.email.label')} error={errors.email?.message}>
          <div className="relative">
            <Mail
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              {...register('email')}
              type="email"
              placeholder={t('auth.email.placeholder')}
              autoComplete="email"
              aria-invalid={errors.email ? true : undefined}
              className={cn(authInputCls, 'pl-10')}
            />
          </div>
        </AuthField>

        {role === 'CARRIER' && (
          <AuthField
            label={t('auth.register.phone.label')}
            error={errors.phone?.message}
          >
            <div className="relative">
              <Phone
                className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <input
                {...register('phone')}
                type="tel"
                placeholder={t('auth.register.phone.placeholder')}
                autoComplete="tel"
                aria-invalid={errors.phone ? true : undefined}
                className={cn(authInputCls, 'pl-10')}
              />
            </div>
          </AuthField>
        )}

        <AuthField
          label={t('auth.password.label')}
          error={errors.password?.message}
          hint="A senha deve ter no mínimo 8 caracteres"
        >
          <div className="relative">
            <Lock
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.password.placeholder')}
              autoComplete="new-password"
              aria-invalid={errors.password ? true : undefined}
              className={cn(authInputCls, 'pr-10 pl-10')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? t('auth.password.hide') : t('auth.password.show')
              }
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 focus-visible:outline-none"
            >
              {showPassword ? (
                <Eye className="size-4" aria-hidden />
              ) : (
                <EyeOff className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </AuthField>

        <AuthField
          label={t('auth.register.confirmPassword.label')}
          error={errors.confirmPassword?.message}
        >
          <div className="relative">
            <Lock
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              {...register('confirmPassword')}
              type={showConfirm ? 'text' : 'password'}
              placeholder={t('auth.password.placeholder')}
              autoComplete="new-password"
              aria-invalid={errors.confirmPassword ? true : undefined}
              className={cn(authInputCls, 'pr-10 pl-10')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={
                showConfirm ? t('auth.password.hide') : t('auth.password.show')
              }
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 focus-visible:outline-none"
            >
              {showConfirm ? (
                <Eye className="size-4" aria-hidden />
              ) : (
                <EyeOff className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </AuthField>
      </div>

      {errors.root && (
        <p className="text-destructive text-center text-[14px] font-medium">
          {errors.root.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-primary-foreground flex h-12 w-full cursor-pointer items-center justify-center rounded-[8px] px-4 py-3 text-[16px] font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-60"
      >
        {isSubmitting
          ? t('auth.register.submitting')
          : t('auth.register.submit')}
      </button>

      <div className="flex items-center justify-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-[14px] leading-[20px]">
          ou
        </span>
        <span className="bg-border h-px flex-1" />
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-center text-[14px] leading-[20px]">
          Já tem uma conta?
        </p>
        <Link
          href="/login"
          className="border-input bg-background text-foreground hover:bg-accent focus-visible:ring-ring flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border px-4 py-3 text-[16px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <LogIn className="size-[18px]" aria-hidden />
          Fazer login
        </Link>
      </div>
    </form>
  )
}
