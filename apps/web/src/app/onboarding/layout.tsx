import type { ReactNode } from 'react'

import { Logo } from '~/components/ui/logo'

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="bg-muted flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo className="text-primary mb-6 text-2xl" />
      <div className="bg-background border-border w-full max-w-[480px] rounded-[12px] border p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
