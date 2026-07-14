'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AuthField, authInputCls } from '~/components/features/auth/auth-field'
import { t } from '~/i18n/t'
import { cn } from '~/lib/utils'

const schema = z.object({
  email: z.email({ message: t('auth.email.invalid') }),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: FormValues) {
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    // Always show success — no email enumeration
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div
        data-slot="forgot-password-form"
        className="flex flex-col items-center gap-5 text-center"
      >
        <CheckCircle className="size-12 text-green-500" aria-hidden />
        <div>
          <p className="text-foreground text-[18px] font-bold">
            {t('auth.forgot.title')}
          </p>
          <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">
            {t('auth.forgot.success')}
          </p>
        </div>
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground text-[14px] font-semibold underline underline-offset-2 transition-colors focus-visible:outline-none"
        >
          {t('auth.forgot.backToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <form
      data-slot="forgot-password-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <p className="text-muted-foreground text-[15px] leading-relaxed">
        {t('auth.forgot.description')}
      </p>

      <AuthField label={t('auth.email.label')} error={errors.email?.message}>
        <input
          {...register('email')}
          type="email"
          placeholder={t('auth.email.placeholder')}
          autoComplete="email"
          className={cn(authInputCls, errors.email && 'border-destructive')}
        />
      </AuthField>

      <div className="mt-2 flex flex-col gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary flex h-[64px] w-full cursor-pointer items-center justify-center rounded-[20px] text-[18px] font-extrabold text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-60"
        >
          {isSubmitting ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
        </button>

        <Link
          href="/login"
          className="text-foreground focus-visible:ring-ring flex h-[64px] w-full items-center justify-center rounded-[20px] text-[18px] font-extrabold underline underline-offset-2 transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-none"
        >
          {t('auth.forgot.backToLogin')}
        </Link>
      </div>
    </form>
  )
}
