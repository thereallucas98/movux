'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AuthField, authInputCls } from '~/components/features/auth/auth-field'
import { t } from '~/i18n/t'
import { cn } from '~/lib/utils'

const schema = z
  .object({
    newPassword: z.string().min(8, { message: t('auth.password.min') }),
    confirmPassword: z.string().min(8, { message: t('auth.password.min') }),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: t('auth.register.confirmPassword.mismatch'),
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

function PasswordInput({
  hasError,
  autoComplete,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        placeholder={t('auth.password.placeholder')}
        autoComplete={autoComplete}
        className={cn(authInputCls, 'pr-12', hasError && 'border-destructive')}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? t('auth.password.hide') : t('auth.password.show')}
        className="text-muted-foreground/70 hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2 focus-visible:outline-none"
      >
        {show ? (
          <Eye className="size-5" aria-hidden />
        ) : (
          <EyeOff className="size-5" aria-hidden />
        )}
      </button>
    </div>
  )
}

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter()
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  async function onSubmit(values: FormValues) {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: values.newPassword }),
    })

    if (!res.ok) {
      setError('root', { message: t('auth.reset.tokenExpired') })
      return
    }

    setDone(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  if (done) {
    return (
      <div
        data-slot="reset-password-form"
        className="flex flex-col items-center gap-5 text-center"
      >
        <CheckCircle className="size-12 text-green-500" aria-hidden />
        <div>
          <p className="text-foreground text-[18px] font-bold">
            {t('auth.reset.success')}
          </p>
          <p className="text-muted-foreground mt-1 text-[14px]">
            {t('auth.reset.redirecting')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <form
      data-slot="reset-password-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <AuthField
        label={t('auth.reset.newPassword.label')}
        error={errors.newPassword?.message}
      >
        <PasswordInput
          {...register('newPassword')}
          autoComplete="new-password"
          hasError={!!errors.newPassword}
        />
      </AuthField>

      <AuthField
        label={t('auth.reset.confirmPassword.label')}
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          {...register('confirmPassword')}
          autoComplete="new-password"
          hasError={!!errors.confirmPassword}
        />
      </AuthField>

      {errors.root && (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-primary text-[14px] font-semibold">
            {errors.root.message}
          </p>
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground text-[13px] font-semibold underline underline-offset-2 transition-colors focus-visible:outline-none"
          >
            {t('auth.reset.requestNewLink')}
          </Link>
        </div>
      )}

      <div className="mt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary flex h-[64px] w-full cursor-pointer items-center justify-center rounded-[20px] text-[18px] font-extrabold text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-60"
        >
          {isSubmitting ? t('auth.reset.submitting') : t('auth.reset.submit')}
        </button>
      </div>
    </form>
  )
}

export function ResetPasswordPageClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-primary text-[16px] font-semibold">
          {t('auth.reset.invalidLinkPrompt')}
        </p>
        <Link
          href="/forgot-password"
          className="text-foreground underline underline-offset-2 focus-visible:outline-none"
        >
          {t('auth.reset.forgotPasswordCta')}
        </Link>
      </div>
    )
  }

  return <ResetPasswordForm token={token} />
}
