import type { ReactNode } from 'react'

import { Logo } from '~/components/ui/logo'

/**
 * Auth shell — Financy node 3107-3489 + brand panel.
 *
 * Layout:
 *   - Outer wrapper is locked to the viewport (`h-dvh overflow-hidden`)
 *     so the page never scrolls as a whole.
 *   - On `lg+`, a green brand panel sits on the left as decorative chrome —
 *     it has `h-full` and `overflow-hidden`, so it can never trigger scroll.
 *   - The right column owns the only scroll area: it scrolls *internally*
 *     if a particular auth view (e.g. register w/ many fields) needs more
 *     vertical room than the viewport offers.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted grid h-dvh w-full grid-cols-1 overflow-hidden lg:grid-cols-[420px_1fr] xl:grid-cols-[500px_1fr]">
      {/* Brand panel — desktop only, decorative, never scrolls */}
      <aside
        aria-hidden="true"
        className="hidden h-full overflow-hidden p-6 lg:block"
      >
        <div className="bg-primary flex h-full w-full items-center justify-center rounded-[20px]">
          <Logo iconOnly className="text-primary-foreground text-3xl" />
        </div>
      </aside>

      {/* Form column — only this region may scroll, and only if content overflows */}
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[608px] flex-col items-center justify-center gap-8 px-4 py-10 sm:px-6">
          <Logo className="text-primary lg:hidden" />
          <div className="bg-background border-border w-full max-w-[448px] rounded-[12px] border p-8 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
