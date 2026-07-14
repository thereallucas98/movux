import { Suspense } from 'react'

import { ResetPasswordPageClient } from '~/components/features/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-foreground text-[20px] leading-[28px] font-bold">
          Nova senha
        </h1>
        <p className="text-muted-foreground text-[16px] leading-[24px]">
          Defina sua nova senha para acessar a conta
        </p>
      </header>

      <Suspense>
        <ResetPasswordPageClient />
      </Suspense>
    </div>
  )
}
