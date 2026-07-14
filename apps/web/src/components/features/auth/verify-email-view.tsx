'use client'

import { CheckCircle, Loader, Mail, XCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { t } from '~/i18n/t'

type State = 'loading' | 'success' | 'error' | 'pending'

export function VerifyEmailView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [state, setState] = useState<State>(token ? 'loading' : 'pending')
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const verifiedRef = useRef(false)

  useEffect(() => {
    if (!token || verifiedRef.current) return
    verifiedRef.current = true

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setState('success')
          setTimeout(() => router.push('/'), 2000)
        } else {
          setState('error')
        }
      })
      .catch(() => setState('error'))
  }, [token, router])

  useEffect(() => {
    if (cooldown <= 0) return
    timerRef.current = setInterval(() => {
      setCooldown((v) => {
        if (v <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [cooldown])

  async function handleResend() {
    const res = await fetch('/api/auth/resend-verification', { method: 'POST' })
    if (res.ok) {
      toast.success(t('auth.verify.resent'))
      setCooldown(60)
    } else {
      toast.error(t('auth.verify.resendError'))
    }
  }

  if (state === 'loading') {
    return (
      <div
        data-slot="verify-email-view"
        className="flex flex-col items-center gap-4 text-center"
      >
        <Loader className="text-foreground size-12 animate-spin" aria-hidden />
        <p className="text-foreground text-[18px] font-bold">
          {t('auth.verify.verifying')}
        </p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div
        data-slot="verify-email-view"
        className="flex flex-col items-center gap-4 text-center"
      >
        <CheckCircle className="size-12 text-green-500" aria-hidden />
        <p className="text-foreground text-[18px] font-bold">
          {t('auth.verify.success')}
        </p>
        <p className="text-muted-foreground text-[15px]">
          {t('auth.verify.redirecting')}
        </p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div
        data-slot="verify-email-view"
        className="flex flex-col items-center gap-5 text-center"
      >
        <XCircle className="text-primary size-12" aria-hidden />
        <div>
          <p className="text-foreground text-[18px] font-bold">
            {t('auth.verify.invalidToken')}
          </p>
          <p className="text-muted-foreground mt-1 text-[14px]">
            {t('auth.verify.invalidTokenPrompt')}
          </p>
        </div>
        <ResendButton cooldown={cooldown} onResend={handleResend} />
      </div>
    )
  }

  return (
    <div
      data-slot="verify-email-view"
      className="flex flex-col items-center gap-5 text-center"
    >
      <div className="bg-primary/10 flex size-16 items-center justify-center rounded-full">
        <Mail className="text-foreground size-8" aria-hidden />
      </div>
      <div>
        <p className="text-foreground text-[18px] font-bold">
          {t('auth.verify.pendingTitle')}
        </p>
        <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">
          {t('auth.verify.pendingDescription')}
        </p>
      </div>
      <ResendButton cooldown={cooldown} onResend={handleResend} />
    </div>
  )
}

function ResendButton({
  cooldown,
  onResend,
}: {
  cooldown: number
  onResend: () => void
}) {
  return (
    <button
      type="button"
      onClick={onResend}
      disabled={cooldown > 0}
      className="bg-primary flex h-[56px] w-full max-w-[320px] cursor-pointer items-center justify-center rounded-[20px] text-[16px] font-extrabold text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-50"
    >
      {cooldown > 0
        ? t('auth.verify.resendCooldown', { seconds: cooldown })
        : t('auth.verify.resendCta')}
    </button>
  )
}
