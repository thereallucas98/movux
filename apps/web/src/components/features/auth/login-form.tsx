'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail, UserRoundPlus } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { AuthField, authInputCls } from '~/components/features/auth/auth-field'
import { t } from '~/i18n/t'
import { cn } from '~/lib/utils'

const loginSchema = z.object({
  email: z.email({ message: t('auth.email.invalid') }),
  password: z.string().min(8, { message: t('auth.password.min') }),
  remember: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '', remember: false },
  })

  async function onSubmit(values: LoginFormValues) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: values.email, password: values.password }),
    })

    if (!res.ok) {
      setError('root', { message: t('auth.login.invalidCredentials') })
      return
    }

    const { user } = await res.json()

    let destination = '/dashboard'
    if (redirectTo) {
      destination = redirectTo
    } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      destination = '/admin/dashboard'
    }

    window.location.href = destination
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      <div className="flex flex-col gap-4">
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

        <AuthField
          label={t('auth.password.label')}
          error={errors.password?.message}
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
              autoComplete="current-password"
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

        <div className="flex items-center justify-between">
          <label className="text-foreground inline-flex cursor-pointer items-center gap-2 text-[14px] leading-[20px]">
            <input
              type="checkbox"
              {...register('remember')}
              className="border-input text-primary focus-visible:ring-ring size-4 rounded-[4px] border focus-visible:ring-2 focus-visible:outline-none"
            />
            <span>Lembrar-me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-primary text-[14px] leading-[20px] font-medium hover:underline"
          >
            {t('auth.login.forgotLink')}
          </Link>
        </div>
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
        {isSubmitting ? t('auth.login.submitting') : 'Entrar'}
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
          Ainda não tem uma conta?
        </p>
        <Link
          href="/register"
          className="border-input bg-background text-foreground hover:bg-accent focus-visible:ring-ring flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border px-4 py-3 text-[16px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <UserRoundPlus className="size-[18px]" aria-hidden />
          {t('auth.login.registerCta')}
        </Link>
      </div>
    </form>
  )
}
